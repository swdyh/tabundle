var Tabundle = function() {}
Tabundle.id = 'tabundle@relucks.org'
Tabundle.contentPath = 'chrome://tabundle/content'
Components.utils.import('resource://tabundle-modules/ioutils.jsm', Tabundle)

Tabundle.init = function() {
    var ext = Components.classes["@mozilla.org/extensions/manager;1"].
        getService(Components.interfaces.nsIExtensionManager).
        getInstallLocation(Tabundle.id).
        getItemLocation(Tabundle.id)
    Tabundle.extDir = ext.path

    var profDir = Components.classes["@mozilla.org/file/directory_service;1"].
        getService(Components.interfaces.nsIProperties).
        get("ProfD", Components.interfaces.nsIFile)

    profDir.append('tabundle')
    Tabundle.IOUtils.mkdir(profDir)
    Tabundle.archivesDir = profDir.path
}

Tabundle.view = function() {
    var index = Tabundle.contentPath + '/index.html'
    gBrowser.selectedTab = gBrowser.addTab(index)
}

Tabundle.archives = function() {
    var file = Tabundle.IOUtils.getFile(Tabundle.archivesDir)
    var entries = file.directoryEntries
    var list = []
    while (entries.hasMoreElements()) {
        var entry = entries.getNext().QueryInterface(Components.interfaces.nsIFile)
        var tmp = entry.path.split('/')
        list.push(tmp[tmp.length - 1])
    }
    return list.filter(function(i) { return /\.html$/.test(i) })
}

Tabundle.bundle = function() {
    var height = window.innerHeight
    var list = Array.map(gBrowser.mTabs, function(tab) {
        var w = gBrowser.getBrowserForTab(tab).contentWindow
        var c = Tabundle.capture(w, {x: 0, y:0}, {h: height, w: w.innerWidth}, 0.3)
        return [w.document.title, w.location.href, c]
    })
    var date = Tabundle.dateString()
    var size = gBrowser.mTabs.length.toString()
    var opt = {
        list: list,
        size: size,
        date: date,
        title: size + 'Tabs ' + date,
        fav: Tabundle.icon(size).toDataURL(),
        style: Tabundle.style()
    }
    var html = Tabundle.createHtml(opt)
    var fileName = date + '.html'
    var out = Tabundle.IOUtils.getFile(Tabundle.archivesDir)
    out.append(fileName)
    Tabundle.IOUtils.write(out, html)
    gBrowser.selectedTab = gBrowser.addTab('file://' + out.path)
}

Tabundle.dateString = function() {
    var d = new Date()
    return [d.getFullYear(), d.getMonth() + 1,
            d.getDate()].map(function(i) { return i.toString() }).join('-')
}

Tabundle.createHtml = function(opt) {
    var html = []
    html.push(['<html>'])
    html.push(['<head>'])
    html.push(['<link rel="shortcut icon" href="', opt['fav'], '" />'])
    html.push(['<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>'])
    html.push(['<title>', opt['title'], '</title>'])
    html.push(['<style type="text/css">', opt['style'], '</style>'])
    html.push(['</head>'])
    html.push(['<body>'])
    html.push(['<h1>', '<img src="', opt['fav'], '" />', opt['title'], '</h1>'])
    html.push(['<ul>'])
    opt['list'].forEach(function(i) {
        html.push(['<li>'])
        html.push(['<div class="capture"><a href="', i[1], '">',
                   '<img style="max-width:300px;" src="', i[2],
                   '"/></a></div>'])
        html.push(['<div class="title"><a href="', i[1], '">', i[0],  '</a></div>'])
        html.push(['<div class="url"><a href="', i[1], '">', i[1],  '</a></div>'])
        html.push(['<br />'])
        html.push(['</li>'])
    })
    html.push(['</ul>'])
    html.push(['</body>'])
    html.push(['</html>'])
    return html.map(function(i) { return i.join('') }).join('\n')
}

Tabundle.capture = function(win, pos, dim, scale){
    var HTML_NS = 'http://www.w3.org/1999/xhtml'
    var canvas = document.createElementNS(HTML_NS, 'canvas')
    var ctx = canvas.getContext('2d')
    canvas.width = dim.w
    canvas.height = dim.h
    if (scale) {
        scale   = scale.w? scale.w/dim.w : scale.h? scale.h/dim.h : scale;
        canvas.width = dim.w * scale
        canvas.height = dim.h * scale
        ctx.scale(scale, scale)
    }
    ctx.drawWindow(win, pos.x, pos.y, dim.w, dim.h, '#fff')
    return canvas.toDataURL('image/png', '')
}

Tabundle.icon = function(size) {
    var HTML_NS = 'http://www.w3.org/1999/xhtml'
    var canvas = document.createElementNS(HTML_NS, 'canvas')
    var ctx = canvas.getContext('2d')
    canvas.width = 50
    canvas.height = 50
    ctx.fillStyle = '#fff'
    ctx.fillRect(0 , 15, canvas.width, 20)
    ctx.fillStyle = '#0af'
    ctx.fillRect(0 , 15, (size > 50 ? 50 : size), 20)
    return canvas
}

Tabundle.style = function() {
    var file = Tabundle.IOUtils.getFile(Tabundle.extDir)
    file.append('chrome')
    file.append('content')
    file.append('tabundle.css')
    return Tabundle.IOUtils.read(file)
}

Tabundle.init()

