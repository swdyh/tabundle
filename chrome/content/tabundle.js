var Tabundle = function() {}
Tabundle.id = 'tabundle@relucks.org'
Tabundle.contentPath = 'chrome://tabundle/content'
Components.utils.import('resource://tabundle-modules/ioutils.jsm', Tabundle)

Tabundle.init = function() {
    try {
        var ext = Components.classes["@mozilla.org/extensions/manager;1"].
            getService(Components.interfaces.nsIExtensionManager).
            getInstallLocation(Tabundle.id).
            getItemLocation(Tabundle.id)
        Tabundle.extDir = ext.path
        Tabundle.initDir()
        Tabundle.initStatuBar()
    }
    catch(e) {
        Components.utils.import("resource://gre/modules/AddonManager.jsm")
        AddonManager.getAddonByID(Tabundle.id, function(addon) {
            Tabundle.extDir = addon.getResourceURI("").QueryInterface(Components.interfaces.nsIFileURL).file.path
            Tabundle.initDir()
            Tabundle.initStatuBar()
        })
    }
}

Tabundle.initDir = function() {
    if (!Tabundle.getHtmlDir()) {
        var profDir = Components.classes["@mozilla.org/file/directory_service;1"].
            getService(Components.interfaces.nsIProperties).
            get("ProfD", Components.interfaces.nsIFile)
        profDir.append('tabundle')
        Tabundle.IOUtils.mkdir(profDir)
        Tabundle.setHtmlDir(profDir.path)
    }
}

Tabundle.initStatuBar = function() {
    var tp = document.getElementById('tabundle-panel')
    if (tp) {
        var v = Application.prefs.getValue('extensions.tabundle.show_icon_in_statusbar', true)
        tp.hidden = !v
    }
}

Tabundle.view = function() {
    var path = Tabundle.createIndexHtml()
    gBrowser.selectedTab = gBrowser.addTab(path)
}

Tabundle.getHtmlDir = function() {
    return Application.prefs.getValue('extensions.tabundle.htmlDir', null)
}

Tabundle.setHtmlDir = function(dir) {
    return Application.prefs.setValue('extensions.tabundle.htmlDir', dir)
}

Tabundle.archives = function() {
    var file = Tabundle.IOUtils.getFile(Tabundle.getHtmlDir())
    var entries = file.directoryEntries
    var list = []
    while (entries.hasMoreElements()) {
        var entry = entries.getNext().QueryInterface(Components.interfaces.nsIFile)
        list.push(entry.leafName)
    }
    return list.filter(function(i) {
        return /\.html$/.test(i) && i != 'index.html'
    })
}

Tabundle.bundle = function() {
    Tabundle.createIndexHtml()
    var path = Tabundle.createListHtml()
    if (path) {
        gBrowser.selectedTab = gBrowser.addTab('file://' + path)
    }
}

Tabundle.dateString = function() {
    var d = new Date()
    var list = [d.getFullYear(), d.getMonth() + 1, d.getDate()]
    return list.map(function(i) {
        var s = i.toString()
        return s.length == 1 ? '0' + s : s
    }).join('-')
    // return d.toLocaleFormat('%Y-%m-%d')
}

Tabundle.createListHtml = function() {
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
    var html = Tabundle.listHtml(opt)
    var fileName = date + '.html'
    var out = Tabundle.IOUtils.getFile(Tabundle.getHtmlDir())
    out.append(fileName)
    var path = out.path

    if (out.exists()) {
        var opt = {
            mode: Components.interfaces.nsIFilePicker.modeSave,
            defaultString: fileName,
            displayDirectory: Tabundle.IOUtils.getFile(Tabundle.getHtmlDir()),
            filters: Components.interfaces.nsIFilePicker.filterHTML
        }
        path = Tabundle.selectFile(opt)
    }

    if (path) {
        Tabundle.IOUtils.write(path, html)
        return path
    }
}

Tabundle.listHtml = function(opt) {
    var html = <html>
        <head>
            <link rel="shortcut icon" href={opt['fav']} />
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
            <title>{opt['title']}</title>
            <style type="text/css">{opt['style']}</style>
        </head>
        <body>
            <h1><img src={opt['fav']} />{opt['title']}</h1>
        </body>
    </html>
    var ul = <ul id="tabundle_list"></ul>
    opt['list'].forEach(function(i) {
        var li = <li>
            <div class="capture"><a href={i[1]}><img src={i[2]} /></a></div>
            <div class="title"><a href={i[1]}>{i[0]}</a></div>
            <div class="url"><a href={i[1]}>{i[1]}</a></div>
            <br />
        </li>
        ul.appendChild(li)
    })
    html.body.ul = ul
    return html.toXMLString()
}

Tabundle.createIndexHtml = function() {
    var icon = Tabundle.icon(20).toDataURL()
    var opt = {
        list: Tabundle.archives().reverse(),
        fav: icon,
        icon: icon,
        style: Tabundle.style()
    }
    var indexHtml = Tabundle.indexHtml(opt)
    var out = Tabundle.IOUtils.getFile(Tabundle.getHtmlDir())
    out.append('index.html')
    Tabundle.IOUtils.write(out, indexHtml)
    return out.path
}

Tabundle.indexHtml = function(opt) {
    var html = <html>
        <head>
            <link rel="shortcut icon" href={opt['fav']} />
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
            <title>Tabundle</title>
            <style type="text/css">{opt['style']}</style>
        </head>
        <body>
            <h1><img src={opt['icon']} />Tabundle</h1>
        </body>
    </html>
    var ul = <ul id="tabundle_index"></ul>
    opt['list'].forEach(function(i) {
        var url = 'file://' + Tabundle.getHtmlDir() + '/' + i
        var li = <li><a href={url}>{i}</a></li>
        ul.appendChild(li)
    })
    html.body.ul = ul
    return html.toXMLString()
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

Tabundle.pref = function() {
    var url = 'chrome://tabundle/content/pref.xul'
    return window.openDialog(url, "_blank", "resizable,dialog=no,centerscreen");
}

Tabundle.selectFile = function(opt) {
    var opt = opt || {}
    var nfp = Components.interfaces.nsIFilePicker
    var fp = Components.classes['@mozilla.org/filepicker;1'].createInstance(nfp)
    var title = opt['title'] || 'Select a File'
    var mode = opt['mode'] || nfp.modeOpen
    fp.init(window, title, mode)

    if (opt['defaultString']) {
        fp.defaultString = opt['defaultString']
    }
    if (opt['displayDirectory']) {
        fp.displayDirectory = opt['displayDirectory']
    }
    if (opt['filters']) {
        fp.appendFilters(opt['filters'])
    }
    var r = fp.show()
    if (r == nfp.returnOK || r == nfp.returnReplace) {
        return fp.file.path
    }
}

Tabundle.init()

