/**
 * download.js - Download files via HTTP/1.1.
 *
 * A very simple Sphere module to download a resource
 * via the HTTP 1.1 protocol.
 *
 * Based on http://www.jmarshall.com/easy/http/geturl11.pl.
 */

var download = (function () {
    var MILLISECONDS_IN_SECONDS = 1000;
    var MAX_REDIRECTS = 3;

    function DownloadException(message)
    {
        this.name = "DownloadException";
        this.message = message || "Unspecified exception";
    }
    DownloadException.prototype.toString = function () {
        return this.name + ": \"" + this.message + "\"";
    };
    
    /* Split a URL into its component parts. */
    function parseUrl(url)
    {
        var split = /^([\w+.-]+):\/\/(.*)/.exec(url);
        var scheme = split[1];
        
        var resourceSplit = /([^\/:]*):?([^\/]*)(\/.*)?$/.exec(split[2]);
        var host = resourceSplit[1];
        var port = resourceSplit[2] ? parseInt(resourceSplit[2], 10) : 80;
        var path = resourceSplit[3] ? resourceSplit[3] : '/';
        
        return {
            scheme: scheme,
            host: host,
            port: port,
            path: path,
        };
    }

    function TimeOutException(time)
    {
        this.name = "TimeOutException";
        this.message = "Timed out (period: " + time + "s)";
    }
    TimeOutException.prototype = new DownloadException();

    /* Wait for a socket, unless it times out. */
    function waitForSocket(socket, timeout)
    {
        var waitTime = timeout || 10;
        var end = GetTime() + waitTime * MILLISECONDS_IN_SECONDS;
        while (!socket.isConnected()) {
            if (GetTime() >= end)
                throw new TimeOutException(waitTime);
        }
    }

    /* Read a line of text from the socket (including \r\n or \n). */
    function readSocketLine(socket)
    {
        var buffer = "";
        while (socket.isConnected() && buffer.substr(-1) != '\n') {
            if (socket.getPendingReadSize() > 0)
                buffer += CreateStringFromByteArray(socket.read(1));
        }
        if (!socket.isConnected())
            throw new DownloadException("Disconnected while reading line");
        return buffer;
    }

    /**
     * Download a URL to a path.
     *
     * @param url {string} the URL of the resource to download
     * @param path {string} (optional) the place to download to.
     *                      Defaults to the URL filename in 'other/',
     *                      or 'download.dat' if it can't be guessed.
     * @param numRedirects {number} (optional) the number of times
     *                              we've been redirected.
     * @return the local filename of the downloaded resource, relative
     *         to the 'other/' directory.
     */
    function download(url, path, numRedirects)
    {
        if (numRedirects && numRedirects >= MAX_REDIRECTS)
            throw new DownloadException("Redirected more than " + MAX_REDIRECTS + " times");
    
        var res = parseUrl(url);
        var filename = path || res.path.match(/\/([^\/\?]*)$/)[1];
        filename = filename ? filename : "download.dat";

        var socket = OpenAddress(res.host, res.port);
        waitForSocket(socket);

        // Send the request
        var request = "GET " + res.path + " HTTP/1.1\r\n" +
                      "Host: " + res.host + "\r\n" +
                      "Connection: close\r\n" +
                      "User-Agent: Sphere download.js/0.1\r\n" +
                      "\r\n";
        socket.write(CreateByteArrayFromString(request));

        // Get back the response code and headers
        var headers = '';
        var status_code;
        var status_message;
        do {
            var status_line = readSocketLine(socket);
            var status_bits = /^HTTP\/\d+\.\d+\s+(\d+)([^\r\n]*)/.exec(status_line);
            status_code = status_bits[1];
            status_message = status_bits[2];

            // Read in headers.
            var header_line = readSocketLine(socket);
            while (header_line != '\r\n' && header_line != '\n') {
                headers += header_line;
                header_line = readSocketLine(socket);
            }

            // Unfold multi-line headers
            headers = headers.replace(/\r?\n[ \t]+/g, ' ');
        } while (status_code == '100');

        // Handle redirects
        if (status_code == '301' || status_code == '302' || status_code == '303') {
            socket.close();
            return download(url, path, numRedirects + 1);
        }

        // Anything that isn't 200 is an error
        if (status_code != '200')
            throw new DownloadException(status_code + " " + status_message);

        //var file = OpenRawFile(filename, true);
	var content = '';
        try {

            // Test for chunked encoding.
            if (headers.search(/^transfer-encoding:[ \t]*chunked\b/im) != -1) {

                // Read in hex size, followed by that many bytes
                var chunk_size = parseInt(readSocketLine(socket), 16);
                while (chunk_size > 0) {
                    var left_to_get = chunk_size;
                    while (left_to_get > 0) {
                        if (socket.getPendingReadSize() > 0) {
                            var read_size = Math.min(socket.getPendingReadSize(), left_to_get);
                            //file.write(socket.read(read_size));
			    content += CreateStringFromByteArray(socket.read(read_size));
                            left_to_get -= read_size;
                        }
                    }

                    // Clear CRLF after chunk
                    readSocketLine(socket);
                    
                    chunk_size = parseInt(readSocketLine(socket), 16);
                }
        
            } else {

                // Handle known content-length downloads
                var content_length_bits = headers.match(/^content-length:[ \t]*(\d*)/im);
                if (content_length_bits) {
                    var content_length = content_length_bits[1];
                    var left_to_get = content_length;
                    while (left_to_get > 0) {
                        if (socket.getPendingReadSize() > 0) {
                            var read_size = Math.min(socket.getPendingReadSize(), left_to_get);
                            //file.write(socket.read(read_size));
			    content += CreateStringFromByteArray(socket.read(read_size));
                            left_to_get -= read_size;
                        }
                    }

                    // Check that we got all expected data
                    if (left_to_get > 0)
                        throw new DownloadException("Download terminated early; expected " + content_length + " bytes, got " + (content_length - left_to_get));
                } else {

                    // No known content length, just dump everything
                    while (socket.isConnected()) {
                        if (socket.getPendingReadSize() > 0) {
                            //file.write(socket.read(socket.getPendingReadSize()));
			    content += CreateStringFromByteArray(socket.read(socket.getPendingReadSize()));
			}
                    }
                
                }
            
            }
        
        } finally {
            //file.close();
        }

        socket.close();
        
        //return filename;
	return content;
    }

    return {
        download: download,
        DownloadException: DownloadException,
        TimeOutException: TimeOutException,
    };
})();
