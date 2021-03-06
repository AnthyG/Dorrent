const fs = require('fs');
const path = require('path');
const shell = require('electron').shell;
const ipc = require('electron').ipcRenderer;

const dragDrop = require('drag-drop');
const WebTorrent = require('webtorrent');

const client = new WebTorrent();

/* FROM http://stackoverflow.com/a/14919494/5712160 */
function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si ? ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[u];
}



var player_seekTime,
    player_seekVolume,
    mouse_active;



var tlist = $('#tlist')[0];
var $tlist = $(tlist);

var player = $('#player')[0];
var $player = $(player);
playerV = $player.find('video')[0];
$playerV = $(playerV);

// START CONTROLS
var cntrls = $('#cntrls')[0];
var $cntrls = $(cntrls);

// START TIMELINE
var cntrls_timeline = $('#cntrls_timeline')[0];
var $cntrls_timeline = $(cntrls_timeline);

var cntrls_timeline_cursortime = $('#cntrls_timeline_cursortime')[0];
var $cntrls_timeline_cursortime = $(cntrls_timeline_cursortime);

var cntrls_timeline_cursorbubble = $('#cntrls_timeline_cursorbubble')[0];
var $cntrls_timeline_cursorbubble = $(cntrls_timeline_cursorbubble);
// END TIMELINE

// START CONTROL-ACTIONS
var cntrls_pp = $('#cntrls_pp')[0];
var $cntrls_pp = $(cntrls_pp);

var cntrls_curtime = $('#cntrls_curtime')[0];
var $cntrls_curtime = $(cntrls_curtime);
var cntrls_totaltime = $('#cntrls_totaltime')[0];
var $cntrls_totaltime = $(cntrls_totaltime);

// START VOLUME
var cntrls_volume = $('#cntrls_volume')[0];
var $cntrls_volume = $(cntrls_volume);

var cntrls_volume_current = $('#cntrls_volume_current')[0];
var $cntrls_volume_current = $(cntrls_volume_current);

var cntrls_volume_cursorbar = $('#cntrls_volume_cursorbar')[0];
var $cntrls_volume_cursorbar = $(cntrls_volume_cursorbar);
// END VOLUME
// END CONTROL-ACTIONS

// END CONTROLS



var onTorrent = function onTorrent(torrent_) {
    (function(torrent) {
        console.log(torrent);

        var $ti = $('<li></li>');

        $ti.appendTo($tlist)

        var $poster = $('<div class="poster"></div>').appendTo($ti);

        var $title = $('<h4 class="title">' + torrent.name + '</h4>').appendTo($ti);
        var $metadata = $('<div class="metadata"></div>').appendTo($ti);
        var $files = $('<ul class="files"></ul>').appendTo($ti);

        var $playbtn = $('<button class="playbtn">Play</button>').appendTo($metadata);

        var $prbtn = $('<button class="prbtn">Pause/Resume</button>').appendTo($metadata);

        var $md_status = $('<span class="status"></span>').appendTo($metadata);

        var $md_progress = $('<progress class="progress" max="100"></progress>').appendTo($metadata);
        var $md_tprogress = $('<span class="tprogress"></span>').appendTo($metadata);

        var $md_downloaded = $('<span class="downloaded"></span>').appendTo($metadata);
        var $md_uploaded = $('<span class="uploaded"></span>').appendTo($metadata);

        var $md_numpeers = $('<span class="numpeers"></span>').appendTo($metadata);

        var $md_downloadspeed = $('<span class="downloadspeed"></span>').appendTo($metadata);
        var $md_uploadspeed = $('<span class="uploadspeed"></span>').appendTo($metadata);

        var $md_timeremaining = $('<span class="timeremaining"></span>').appendTo($metadata);

        function torrentUpDown() {
            // console.log(torrent.downloadSpeed, torrent.uploadSpeed);

            torrent.emit('metadata');
            torrent.downloadSpeed ? torrent.emit('download') : false;
            torrent.uploadSpeed ? torrent.emit('upload') : false;
            (!torrent.downloadSpeed && !torrent.uploadSpeed) ? torrent.emit('done'): false;
        }

        function torrentDone() {
            // console.log('Torrent with id ' + torrent.magnetURI + ' is finished');
            clearInterval(torrent.interval);

            var posterFile = torrent.files.find(function(file) {
                return file.name.startsWith('poster.');
            });
            console.log("POSTER", posterFile);

            $poster.css("backgroundImage", "url(" + (torrent.path + (posterFile.path).replace(/\\/gm, "/") || "") + ")");

            $md_status.text('Not seeding');

            $md_progress.val(torrent.progress * 100);
            $md_tprogress.text((torrent.progress * 100).toFixed(1) + '%');

            $md_downloaded.text(humanFileSize(torrent.downloaded, 'MB'));
            $md_uploaded.text('');

            $md_numpeers.text('');

            $md_downloadspeed.text('');
            $md_uploadspeed.text('');

            $md_timeremaining.text('');
        }

        function torrentDownload(bytes) {
            var bytes = bytes || 0;
            // console.log('just downloaded: ' + bytes)

            $md_status.text('Downloading');

            $md_progress.val(torrent.progress * 100);
            $md_tprogress.text((torrent.progress * 100).toFixed(1) + '%');

            $md_downloaded.text(humanFileSize(torrent.downloaded, 'MB'));
            $md_uploaded.text('');

            $md_numpeers.text(torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers'));

            $md_downloadspeed.text(humanFileSize(torrent.downloadSpeed, 'MB') + '/s');
            $md_uploadspeed.text('');

            var remaining = moment.duration(torrent.timeRemaining / 1000, 'seconds').humanize()
            remaining = remaining[0].toUpperCase() + remaining.substring(1)
            $md_timeremaining.text(remaining);

            torrent.done ? torrentDone() : false;
        }

        function torrentUpload(bytes) {
            if (torrent.downloadSpeed !== 0)
                return false;

            var bytes = bytes || 0;
            // console.log('just uploaded: ' + bytes)

            $md_status.text('Seeding');

            $md_progress.val(torrent.progress * 100);
            $md_tprogress.text((torrent.progress * 100).toFixed(1) + '%');

            $md_downloaded.text(humanFileSize(torrent.downloaded, 'MB'));
            $md_uploaded.text(humanFileSize(torrent.downloaded, 'MB'));

            $md_numpeers.text(torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers'));

            $md_downloadspeed.text('');
            $md_uploadspeed.text(humanFileSize(torrent.uploadSpeed, 'MB') + '/s');

            $md_timeremaining.text('');
        }

        torrent.on('metadata', function() {
            $ti.children('ul').html('');
            for (var fx = 0; fx < torrent.files.length; fx++) {
                var fy = torrent.files[fx];
                $('<li>' + fy.name + '</li>').appendTo($ti.children('ul'));
            }
        });

        torrent.on('done', function() {
            torrentDone();
        });

        torrent.on('download', torrentDownload);
        torrent.on('upload', torrentUpload);

        torrent.on('wire', function(wire, addr) {
            // console.log('connected to peer with address ' + addr);
            // console.log(wire);
        });

        torrent.interval = setInterval(torrentUpDown, 500);
        torrentUpDown();

        $ti.on('click', function(e) {
            var isbtn = $(e.target).is('button');
            console.log("CLICK > Toggled", !isbtn);
            isbtn ? false : $ti.toggleClass('open');
        });

        $prbtn.on('click', function(e) {
            console.log("CLICK > Paused/Resumed");
            torrent.paused ? torrent.resume() : torrent.pause();
        });

        $playbtn.on('click', function(e) {
            player_start(torrent.magnetURI);
        });
    })(torrent_);
}

function addTorrent(torrentId) {
    client.add(torrentId, {
        path: "./TORRENTS/"
    }, onTorrent);
}

function seedTorrent(files) {
    client.seed(files, {
        path: "./TORRENTS/"
    }, onTorrent);
}

function player_start(torrentId) {
    $('#back-btn').on('click', function() {
        player_stop();
    });
    $('#hideplayer-btn').show();
    $('#hideplayer-btn').on('click', function() {
        $('html').toggleClass('playing');
    });

    var torrent = client.get(torrentId);
    var file = torrent.files.find(function(file) {
        return file.name.endsWith('.mp4');
    });
    file.renderTo(playerV, {
        autoplay: false,
        controls: false
    }, function(err, elem) {

        if (err) throw err;
        console.log('New DOM node with the content', elem);

        $('html').addClass('playing');

        $cntrls_curtime.text(elem.currentTime || '0:00');

        var a = elem.duration / 60;
        var b = a - Math.floor(a);
        var c = b * 60;
        var d = parseInt(c) || '00';
        var e = parseInt(a) || '00';
        $cntrls_totaltime.text(e + ':' + d);

        player_update_volume();
    });
}

function player_stop() {
    playerV.pause();

    $('#hideplayer-btn').hide();
    $('#back-btn').off('click');

    $('html').removeClass('playing');
}

function player_pp() {
    // playerV.paused ? playerV.play() : playerV.pause();
    if (playerV.paused) {
        playerV.play();
        $cntrls_pp.addClass('pause');
    } else {
        playerV.pause();
        $cntrls_pp.removeClass('pause');
    }
}

function player_update_currentTime(t) {
    var t = t || 0;

    playerV.currentTime = t;

    playerV.paused ? (function() {
        player_pp();
        setTimeout(function() {
            player_pp();
        }, 0);
    })() : false;
}

function player_update_volume(v) {
    var v = v || 0.025;

    playerV.volume = v;

    $cntrls_volume_current.css('width', (v * 100) + '%');
}

$(document).on('ready', function() {
    $(document).on('keydown', null, 'ctrl+n', function(e) {
        ipc.send('new_window');
    });

    mainmenu = new Menu($('#menu-btn'));
    mainmenu.elem.attr('id', 'mainmenu');

    /*
    $mm_themechanger = undefined;
    var $mm_themechanger = mainmenu.addItem('Themechanger', function() {});
    $mm_themechangerN = $('<div class="menu-item-list"></div>');
    $mm_themechanger_1 = $('<a href="#" class="menu-item">Body</a>').appendTo($mm_themechangerN);
    $mm_themechanger_1.on('click', function(e) {
        $('html').toggleClass('dark');
    });
    $mm_themechanger_2 = $('<a href="#" class="menu-item">Bar</a>').appendTo($mm_themechangerN);
    $mm_themechanger_2.on('click', function(e) {
        $('html').toggleClass('tintedbar');
    });
    $mm_themechanger_3 = $('<a href="#" class="menu-item">Border</a>').appendTo($mm_themechangerN);
    $mm_themechanger_3.on('click', function(e) {
        $('html').toggleClass('bordered');
    });
    $('<div class="menu-item-separator"></div>').insertAfter($mm_themechangerN);
    $mm_themechanger.replaceWith($mm_themechangerN);
    */

    // mainmenu.addItem('Download "Sintel"', function() {
    addTorrent('magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent');
    // });

    $mm_input = undefined;
    var $mm_inputSet = mainmenu.addItem('Download', function() {
        addTorrent($mm_input.val());
        $mm_input.val('');
    });
    $mm_input = $('<input class="menu-item" type="text" placeholder="magnet-URI" />').insertBefore($mm_inputSet);

    mainmenu.addItem('Settings', function() {
        // $('html').addClass('settings');
    });

    $('#menu-btn').on('click', function(e) {
        mainmenu.show();
    });

    // Delete the following 3 events,
    // after the settings-page has been implemented!
    $('#theme-dark-btn').on('click', function(e) {
        $('html').toggleClass('dark');
    });
    $('#theme-tintedbar-btn').on('click', function(e) {
        $('html').toggleClass('tintedbar');
    });
    $('#theme-bordered-btn').on('click', function(e) {
        $('html').toggleClass('bordered');
    });

    dragDrop('body', function(files) {
        seedTorrent(files);
    });

    $(document).on('mousemove', function(e) {
        $('html').addClass('mouse_active');
        clearTimeout(mouse_active);
        mouse_active = setTimeout(function() {
            $('html').removeClass('mouse_active');
        }, 4000);
    });

    $cntrls_pp.on('click', function(e) {
        player_pp();
    })
    $playerV.on('click', function(e) {
        player_pp();
    });
    $(document).on('keydown', null, 'space', function(e) {
        player_pp();
    });

    $playerV.on('timeupdate', function(e) {
        var abc = playerV.currentTime;
        var abc2 = playerV.duration;
        var abc3 = 100 / abc2;
        var abc4 = abc3 * abc;
        var abc5 = abc4.toString();
        $('#cntrls_timeline_curtime').css('width', abc5 + '%');

        var a = player_seekTime / 60;
        var b = a - Math.floor(a);
        var c = b * 60;
        var d = parseInt(c) || '00';
        var e = parseInt(a) || '00';

        d = d < 10 && d > 0 ? '0' + d : d;

        $cntrls_curtime.text(e + ':' + d);
    });
    $playerV.on('progress', function(e) {
        var bufferedEnd = playerV.buffered.end(playerV.buffered.length - 1);
        var duration = playerV.duration;
        if (duration > 0) {
            $('#cntrls_timeline_loadtime').css('width', ((bufferedEnd / duration) * 100) + '%');
        }
    });

    $cntrls_timeline.on('mouseenter', function(e) {
        $cntrls_timeline_cursorbubble.css('display', 'block');
        $cntrls_timeline_cursortime.css('display', 'block');
    });
    $cntrls_timeline.on('mouseleave', function(e) {
        $cntrls_timeline_cursorbubble.css('display', 'none');
        $cntrls_timeline_cursortime.css('display', 'none');
    });
    $cntrls_timeline.on('mousemove', function(e) {
        var cursorPos = (e.clientX - (cntrls_timeline.getBoundingClientRect().left)) / (cntrls_timeline.offsetWidth);

        var cP1 = cursorPos * 100;
        player_seekTime = cursorPos * playerV.duration;

        $cntrls_timeline_cursortime.css('width', cP1 + '%');
        if (cP1 > 95) {
            $cntrls_timeline_cursorbubble.css('left', '95%');
        } else if (cP1 < 0) {
            $cntrls_timeline_cursorbubble.css('left', '0%');
        } else {
            $cntrls_timeline_cursorbubble.css('left', cP1 + '%');
        }

        var a = player_seekTime / 60;
        var b = a - Math.floor(a);
        var c = b * 60;
        var d = parseInt(c) || '00';
        var e = parseInt(a) || '00';

        d = d < 10 && d > 0 ? '0' + d : d;

        $cntrls_timeline_cursorbubble.text(e + ':' + d);
    });
    $cntrls_timeline.on('click', function(e) {
        player_update_currentTime(player_seekTime);
    });

    $cntrls_volume.on('mouseenter', function(e) {
        $cntrls_volume_cursorbar.css('display', 'block');
    });
    $cntrls_volume.on('mouseleave', function(e) {
        $cntrls_volume_cursorbar.css('display', 'none');
    });
    $cntrls_volume.on('mousemove', function(e) {
        var cursorPos = (e.clientX - (cntrls_volume.getBoundingClientRect().left)) / (cntrls_volume.offsetWidth);

        var cP1 = cursorPos * 100;
        player_seekVolume = 0 + cursorPos;

        $cntrls_volume_cursorbar.css('width', cP1 + '%');
    });
    $cntrls_volume.on('click', function(e) {
        console.log(player_seekVolume);
        player_update_volume(player_seekVolume);
    });
});

(function() {
    const remote = require('electron').remote;

    function init() {
        document.getElementById("min-btn").addEventListener("click", function(e) {
            const window = remote.getCurrentWindow();
            window.minimize();
        });

        document.getElementById("max-btn").addEventListener("click", function(e) {
            const window = remote.getCurrentWindow();
            if (!window.isMaximized()) {
                window.maximize();
            } else {
                window.unmaximize();
            }
        });

        document.getElementById("close-btn").addEventListener("click", function(e) {
            const window = remote.getCurrentWindow();
            window.close();
        });
    }

    document.onreadystatechange = function() {
        if (document.readyState == "complete") {
            init();
        }
    };
})();