var EXPORTED_SYMBOLS = ['IOUtils']

IOUtils = {}
IOUtils.getFile = function(path) {
    if (path instanceof Components.interfaces.nsIFile) {
        return path
    }
    if (!/^file:\/\//.test(path)) {
        path = 'file://' + path
    }
    var ios = Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService)
    var fileHandler = ios.getProtocolHandler("file")
        .QueryInterface(Components.interfaces.nsIFileProtocolHandler)
    return fileHandler.getFileFromURLSpec(path)
}

IOUtils.read = function(path) {
    var file = IOUtils.getFile(path)
    var data = ''
    var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
        .createInstance(Components.interfaces.nsIFileInputStream)
    var sstream = Components.classes["@mozilla.org/scriptableinputstream;1"]
        .createInstance(Components.interfaces.nsIScriptableInputStream)
    fstream.init(file, -1, 0, 0)
    sstream.init(fstream)
    var str = sstream.read(4096)
    while (str.length > 0) {
        data += str
        str = sstream.read(4096)
    }
    sstream.close()
    fstream.close()
    return data
}

IOUtils.write = function(path, data, opt) {
    var file = IOUtils.getFile(path)
    var outStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream)
    outStream.init(file, 0x04 | 0x08 | 0x20, 0664, 0)
    var opt = opt || {}
    var charset = opt.charset || "UTF-8"
    var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
            .createInstance(Components.interfaces.nsIConverterOutputStream)
    os.init(outStream, charset, 0, 0x0000)
    os.writeString(data)
    os.close()
}

IOUtils.mkdir = function(path, permission) {
    var file = IOUtils.getFile(path)
    var per  = permission || 0744
    if (!file.exists()) {
        file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, per)
    }
}
