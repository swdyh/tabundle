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
        var c = null
        try {
            c = Tabundle.capture(w, {x: 0, y:0}, {h: height, w: w.innerWidth}, 0.3)
        }
        catch (e) {
            return null
        }
        return [w.document.title, w.location.href, c]
    }).filter(function(i) { return i })
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
    var html = Tabundle.baseHtml(opt)
    var ul = document.createElement('ul')
    ul.setAttribute('id', 'tabundle_list')
    opt.list.forEach(function(i) {
        var tags = ['li', 'div', 'a', 'img', 'div', 'a',
                    'div', 'a'].map(function(tagname) { return document.createElement(tagname) })
        tags[1].className = 'capture'
        tags[2].setAttribute('href', i[1])
        tags[3].setAttribute('src', i[2])
        tags[4].setAttribute('class', 'title')
        tags[5].setAttribute('href', i[1])
        tags[5].appendChild(document.createTextNode(i[0]))
        tags[6].setAttribute('class', 'url')
        tags[7].setAttribute('href', i[1])
        tags[7].appendChild(document.createTextNode(i[1]))
        tags[0].appendChild(tags[1])
        tags[0].appendChild(tags[4])
        tags[0].appendChild(tags[6])
        tags[0].appendChild(document.createElement('br'))
        tags[1].appendChild(tags[2])
        tags[2].appendChild(tags[3])
        tags[4].appendChild(tags[5])
        tags[6].appendChild(tags[7])
        ul.appendChild(tags[0])
    })
    html.lastChild.appendChild(ul)
    // var pre = document.createElement('pre')
    // pre.appendChild(document.createTextNode(JSON.stringify(opt, null, 4)))
    // html.lastChild.appendChild(pre)
    return html.outerHTML.replace(/ xmlns="[^"]+"/, '')
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

Tabundle.baseHtml = function(opt) {
    var tags = ['html', 'head', 'link', 'meta', 'title', 'style', 'body',
                'h1', 'img'].map(function(tagname) { return document.createElement(tagname) })
    tags[2].setAttribute('rel', 'shortcut icon')
    tags[2].setAttribute('href', opt.icon || opt.fav)
    tags[3].setAttribute('charset', 'UTF-8')
    tags[4].appendChild(document.createTextNode('Tabundle'))
    tags[5].setAttribute('type', 'text/css')
    tags[5].appendChild(document.createTextNode(opt.style))
    tags[8].setAttribute('src', opt.icon || opt.fav)
    tags[0].appendChild(tags[1])
    tags.slice(2, 6).forEach(function(i) { tags[1].appendChild(i) })
    tags[0].appendChild(tags[6])
    tags[6].appendChild(tags[7])
    tags[7].appendChild(tags[8])
    tags[7].appendChild(document.createTextNode('Tabundle'))
    return tags[0]
}

Tabundle.indexHtml = function(opt) {
    var html = Tabundle.baseHtml(opt)
    var ul = document.createElement('ul')
    ul.setAttribute('id', 'tabundle_index')
    opt['list'].forEach(function(i) {
        var url = 'file://' + Tabundle.getHtmlDir() + '/' + i
        var li = document.createElement('li')
        var a = document.createElement('a')
        a.setAttribute('href', url)
        a.appendChild(document.createTextNode(i))
        li.appendChild(a)
        ul.appendChild(li)
    })
    html.lastChild.appendChild(ul)
    return html.outerHTML.replace(/ xmlns="[^"]+"/, '')
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

