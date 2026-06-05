const maxTimeDifference = 2;

var resourceName = 'pmms';
var isRDR = true;
var audioVisualizations = {};
var currentServerEndpoint = '127.0.0.1:30120';

function sendMessage(name, params) {
	return fetch(`https://${resourceName}/${name}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(params)
	});
}

function applyPhonographFilter(player) {
	var context = new (window.AudioContext || window.webkitAudioContext)();

	var source;

	if (player.youTubeApi) {
		var html5Player = player.youTubeApi.getIframe().contentWindow.document.querySelector('.html5-main-video');

		source = context.createMediaElementSource(html5Player);
	} else if (player.hlsPlayer) {
		source = context.createMediaElementSource(player.hlsPlayer.media);
	} else if (player.originalNode) {
		source = context.createMediaElementSource(player.originalNode);
	} else {
		source = context.createMediaElementSource(player);
	}

	if (source) {
		var splitter = context.createChannelSplitter(2);
		var merger = context.createChannelMerger(2);

		var gainNode = context.createGain();
		gainNode.gain.value = 0.5;

		var lowpass = context.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.value = 3000;
		lowpass.gain.value = -1;

		var highpass = context.createBiquadFilter();
		highpass.type = 'highpass';
		highpass.frequency.value = 300;
		highpass.gain.value = -1;

		source.connect(splitter);
		splitter.connect(merger, 0, 0);
		splitter.connect(merger, 1, 0);
		splitter.connect(merger, 0, 1);
		splitter.connect(merger, 1, 1);
		merger.connect(gainNode);
		gainNode.connect(lowpass);
		lowpass.connect(highpass);
		highpass.connect(context.destination);
	}

	var noise = document.createElement('audio');
	noise.id = player.id + '_noise';
	noise.src = 'https://redm.khzae.net/phonograph/noise.webm';
	noise.volume = 0;
	document.body.appendChild(noise);
	noise.play();

	player.style.filter = 'sepia()';

	player.addEventListener('play', event => {
		noise.play();
	});
	player.addEventListener('pause', event => {
		noise.pause();
	});
	player.addEventListener('volumechange', event => {
		noise.volume = player.volume;
	});
	player.addEventListener('seeked', event => {
		noise.currentTime = player.currentTime;
	});
}

function applyRadioFilter(player) {
	var context = new (window.AudioContext || window.webkitAudioContext)();

	var source;

	if (player.youTubeApi) {
		var html5Player = player.youTubeApi.getIframe().contentWindow.document.querySelector('.html5-main-video');

		source = context.createMediaElementSource(html5Player);
	} else if (player.hlsPlayer) {
		source = context.createMediaElementSource(player.hlsPlayer.media);
	} else if (player.originalNode) {
		source = context.createMediaElementSource(player.originalNode);
	} else {
		source = context.createMediaElementSource(player);
	}

	if (source) {
		var splitter = context.createChannelSplitter(2);
		var merger = context.createChannelMerger(2);

		var gainNode = context.createGain();
		gainNode.gain.value = 0.5;

		var lowpass = context.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.value = 5000;
		lowpass.gain.value = -1;

		var highpass = context.createBiquadFilter();
		highpass.type = 'highpass';
		highpass.frequency.value = 200;
		highpass.gain.value = -1;

		source.connect(splitter);
		splitter.connect(merger, 0, 0);
		splitter.connect(merger, 1, 0);
		splitter.connect(merger, 0, 1);
		splitter.connect(merger, 1, 1);
		merger.connect(gainNode);
		gainNode.connect(lowpass);
		lowpass.connect(highpass);
		highpass.connect(context.destination);
	}
}

function createAudioVisualization(player, visualization) {
	var waveCanvas = document.createElement('canvas');
	waveCanvas.id = player.id + '_visualization';
	waveCanvas.style.position = 'absolute';
	waveCanvas.style.top = '0';
	waveCanvas.style.left = '0';
	waveCanvas.style.width = '100%';
	waveCanvas.style.height = '100%';

	player.appendChild(waveCanvas);

	var html5Player;

	if (player.youTubeApi) {
		html5Player = player.youTubeApi.getIframe().contentWindow.document.querySelector('.html5-main-video');
	} else if (player.hlsPlayer) {
		html5Player = player.hlsPlayer.media;
	} else if (player.originalNode) {
		html5Player = player.originalNode;
	} else {
		html5Player = player;
	}

	if (!html5Player.id) {
		html5Player.id = player.id + '_html5Player';
	}

	html5Player.style.visibility = 'hidden';

	var doc = player.youTubeApi ? player.youTubeApi.getIframe().contentWindow.document : document;

	if (player.youTubeApi) {
		player.youTubeApi.getIframe().style.visibility = 'hidden';
	}

	var wave = new Wave();

	var options;

	if (visualization) {
		options = audioVisualizations[visualization] || {};

		if (options.type == undefined) {
			options.type = visualization;
		}
	} else {
		options = {type: 'cubes'}
	}

	options.skipUserEventsWatcher = true;
	options.elementDoc = doc;

	wave.fromElement(html5Player.id, waveCanvas.id, options);
}

function showLoadingIcon() {
	document.getElementById('loading').style.display = 'block';
}

function hideLoadingIcon() {
	document.getElementById('loading').style.display = 'none';
}

function resolveUrl(url) {
	if (url.startsWith('http://') || url.startsWith('https://')) {
		return url;
	} else {
		return 'http://' + currentServerEndpoint + '/pmms/media/' + url;
	}
}

// FIX: MediaElement.js removed — broken on recent Chromium/CEF.
// YouTube: IFrame API (no ads, real volume control, reliable autoplay).
// Other URLs: native HTML5 video/audio.

var ytApiReady = false, ytApiLoading = false, ytPlayerQueue = [];

function loadYouTubeApi() {
	if (ytApiReady || ytApiLoading) return;
	ytApiLoading = true;
	var tag = document.createElement('script');
	tag.src = 'https://www.youtube.com/iframe_api';
	document.head.appendChild(tag);
	window.onYouTubeIframeAPIReady = function() {
		ytApiReady = true; ytApiLoading = false;
		ytPlayerQueue.forEach(function(fn) { fn(); });
		ytPlayerQueue = [];
	};
}

function resolveYouTubeId(url) {
	var videoId = null, listId = null;
	try {
		var u = new URL(url);
		var host = u.hostname.replace(/^www\./, '');
		if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
			videoId = u.searchParams.get('v');
			listId  = u.searchParams.get('list');
			var m;
			m = u.pathname.match(/\/shorts\/([A-Za-z0-9_\-]+)/); if (m) videoId = m[1];
			m = u.pathname.match(/\/embed\/([A-Za-z0-9_\-]+)/);  if (m) videoId = m[1];
			m = u.pathname.match(/\/v\/([A-Za-z0-9_\-]+)/);      if (m) videoId = m[1];
		} else if (host === 'youtu.be') {
			videoId = u.pathname.replace(/^\//, '').split('?')[0];
			listId  = u.searchParams.get('list');
		}
		if (videoId) videoId = videoId.replace(/[^A-Za-z0-9_\-]/g, '');
		if (videoId === '') videoId = null;
	} catch(e) {}
	return { videoId: videoId, listId: listId };
}

function createYouTubePlayer(containerId, videoId, listId, startSec, onReady) {
	if (!ytApiReady) {
		loadYouTubeApi();
		ytPlayerQueue.push(function() { createYouTubePlayer(containerId, videoId, listId, startSec, onReady); });
		return;
	}
	var playerVars = {
		autoplay: 1, controls: 0, disablekb: 1, fs: 0,
		iv_load_policy: 3, modestbranding: 1, rel: 0,
		start: Math.floor(startSec || 0)
	};
	if (listId) { playerVars.list = listId; playerVars.listType = 'playlist'; }
	new YT.Player(containerId, {
		videoId: videoId,
		playerVars: playerVars,
		events: {
			onReady: function(e) { e.target.setVolume(0); e.target.playVideo(); if (onReady) onReady(e.target); },
			onError: function(e) { console.warn('[PMMS DUI] YT error:', e.data); }
		}
	});
}

function initPlayer(id, handle, options) {
	if (options.attenuation == null) {
		options.attenuation = {sameRoom: 0, diffRoom: 0};
	}

	var isYouTube = options.url && (
		options.url.indexOf('youtube.com') !== -1 ||
		options.url.indexOf('youtu.be') !== -1
	);

	if (isYouTube) {
		var parsed = resolveYouTubeId(options.url);
		if (!parsed.videoId && !parsed.listId) {
			hideLoadingIcon();
			sendMessage('initError', { url: options.url, message: 'Could not extract YouTube video ID' });
			return;
		}

		// Proxy DOM pour compatibilité avec le reste du code PMMS
		var proxy = document.createElement('div');
		proxy.id = id;
		proxy.className = 'player';
		proxy._ytPlayer = null;
		proxy._volume   = 0;
		proxy.paused    = false;
		proxy.videoTracks = { length: 1 };
		proxy.pmms = {
			initialized: false,
			attenuationFactor: options.attenuation.diffRoom,
			volumeFactor: options.diffRoomVolume != null ? options.diffRoomVolume : 1.0
		};
		document.body.appendChild(proxy);

		var container = document.createElement('div');
		container.id = id + '_yt';
		container.style.cssText = 'position:fixed;width:1px;height:1px;top:-9999px;left:-9999px;overflow:hidden;';
		document.body.appendChild(container);

		var startSec = (options.offset && options.offset > 0) ? options.offset : 0;

		createYouTubePlayer(container.id, parsed.videoId, parsed.listId, startSec, function(ytPlayer) {
			hideLoadingIcon();
			proxy._ytPlayer = ytPlayer;

			var dur = ytPlayer.getDuration ? ytPlayer.getDuration() : 0;
			if (!dur || !isFinite(dur) || dur <= 0) {
				options.duration = false; options.loop = false; options.offset = 0;
			} else {
				options.duration = dur;
			}
			try { if (!options.title) options.title = ytPlayer.getVideoData().title; } catch(e) {}
			options.video = true;
			options.videoSize = 0;

			if (!proxy.pmms.initialized) {
				sendMessage('init', { handle: handle, options: options });
				proxy.pmms.initialized = true;
			}
		});

		proxy.play  = function() { if (proxy._ytPlayer) proxy._ytPlayer.playVideo();  proxy.paused = false; };
		proxy.pause = function() { if (proxy._ytPlayer) proxy._ytPlayer.pauseVideo(); proxy.paused = true;  };
		Object.defineProperty(proxy, 'currentTime', {
			get: function() { return proxy._ytPlayer ? proxy._ytPlayer.getCurrentTime() : 0; },
			set: function(t) { if (proxy._ytPlayer) proxy._ytPlayer.seekTo(t, true); }
		});
		Object.defineProperty(proxy, 'volume', {
			get: function() { return proxy._volume; },
			set: function(v) { proxy._volume = v; if (proxy._ytPlayer) proxy._ytPlayer.setVolume(Math.round(v * 100)); }
		});
		Object.defineProperty(proxy, 'readyState', {
			get: function() { return proxy._ytPlayer ? 4 : 0; }
		});

	} else {
		// Audio/vidéo HTML5 natif
		var media = document.createElement('video');
		media.id = id;
		media.src = resolveUrl(options.url);
		media.crossOrigin = 'anonymous';
		media.className = 'player';
		media.pmms = {
			initialized: false,
			attenuationFactor: options.attenuation.diffRoom,
			volumeFactor: options.diffRoomVolume != null ? options.diffRoomVolume : 1.0
		};
		media.volume = 0;

		media.addEventListener('error', function() {
			hideLoadingIcon();
			var msg = (media.error && media.error.message) ? media.error.message : 'Playback error';
			sendMessage('playError', { url: options.url, message: msg });
			if (!media.pmms.initialized) media.remove();
		});

		media.addEventListener('canplay', function() {
			if (media.pmms.initialized) return;
			hideLoadingIcon();
			if (!isFinite(media.duration) || media.duration === 0) {
				options.offset = 0; options.duration = false; options.loop = false;
			} else {
				options.duration = media.duration;
			}
			media.videoTracks = media.videoTracks || { length: 0 };
			options.video = true;
			options.videoSize = 0;
			sendMessage('init', { handle: handle, options: options });
			media.pmms.initialized = true;
			media.play().catch(function() {});
		});

		media.addEventListener('playing', function() {
			if (options.filter && !media.pmms.filterAdded) {
				if (isRDR) { applyPhonographFilter(media); } else { applyRadioFilter(media); }
				media.pmms.filterAdded = true;
			}
		});

		document.body.appendChild(media);
		media.play().catch(function() {});
	}
}

function getPlayer(handle, options) {
	if (handle == undefined) {
		return;
	}

	var id = 'player_' + handle.toString();

	var player = document.getElementById(id);

	if (!player && options && options.url) {
		player = initPlayer(id, handle, options);
	}

	return player;
}

function parseTimecode(timecode) {
	if (typeof timecode != "string") {
		return timecode;
	} else if (timecode.includes(':')) {
		var a = timecode.split(':');
		return parseInt(a[0]) * 3600 + parseInt(a[1]) * 60 + parseInt(a[2]);
	} else {
		return parseInt(timecode);
	}
}

function init(data) {
	if (data.url == '') {
		return;
	}

	showLoadingIcon();

	data.options.offset = parseTimecode(data.options.offset);
	// FIX: Don't pre-fill title with URL here — initPlayer will set the real
	// YouTube title after the player loads. Fallback happens inside initPlayer.
	getPlayer(data.handle, data.options);
}

function play(handle) {
	var player = getPlayer(handle);
}

function stop(handle) {
	var player = getPlayer(handle);

	if (player) {
		var noise = document.getElementById(player.id + '_noise');
		if (noise) {
			noise.remove();
		}

		player.remove();
	}
}

function setAttenuationFactor(player, target) {
	if (player.pmms.attenuationFactor > target) {
		player.pmms.attenuationFactor -= 0.1;
	} else {
		player.pmms.attenuationFactor += 0.1;
	}
}

function setVolumeFactor(player, target) {
	if (player.pmms.volumeFactor > target) {
		player.pmms.volumeFactor -= 0.01;
	} else {
		player.pmms.volumeFactor += 0.01;
	}
}

function setVolume(player, target) {
	if (Math.abs(player.volume - target) > 0.1) {
		if (player.volume > target) {
			player.volume -= 0.05;
		} else{
			player.volume += 0.05;
		}
	}
}

function update(data) {
	var player = getPlayer(data.handle, data.options);

	if (player) {
		if (data.options.paused || data.distance < 0 || data.distance > data.options.range) {
			if (!player.paused) {
				player.pause();
			}
		} else {
			if (data.sameRoom) {
				setAttenuationFactor(player, data.options.attenuation.sameRoom);
				setVolumeFactor(player, 1.0);
			} else {
				setAttenuationFactor(player, data.options.attenuation.diffRoom);
				setVolumeFactor(player, data.options.diffRoomVolume);
			}

			if (player.readyState > 0) {
				var volume;

				if (data.options.muted || data.volume == 0) {
					volume = 0;
				} else {
					volume = (((100 - data.distance * player.pmms.attenuationFactor) / 100) * player.pmms.volumeFactor) * (data.volume / 100);
				}

				if (volume > 0) {
					if (data.distance > 100) {
						setVolume(player, volume);
					} else {
						player.volume = volume;
					}
				} else {
					player.volume = 0;
				}

				if (data.options.duration) {
					var currentTime = data.options.offset % player.duration;

					if (Math.abs(currentTime - player.currentTime) > maxTimeDifference) {
						player.currentTime = currentTime;
					}
				}

				if (player.paused) {
					player.play();
				}
			}
		}
	}
}

function setResourceNameFromUrl() {
	var url = new URL(window.location);
	var params = new URLSearchParams(url.search);
	resourceName = params.get('resourceName') || resourceName;
}

window.addEventListener('message', event => {
	switch (event.data.type) {
		case 'init':
			init(event.data);
			break;
		case 'play':
			play(event.data.handle);
			break;
		case 'stop':
			stop(event.data.handle);
			break;
		case 'update':
			update(event.data);
			break;
		case 'DuiBrowser:init':
			sendMessage('DuiBrowser:initDone', {handle: event.data.handle});
			break;
	}
});

window.addEventListener('load', () => {
	setResourceNameFromUrl();

	sendMessage('duiStartup', {}).then(resp => resp.json()).then(resp => {
		if (resp.isRDR != undefined) {
			isRDR = resp.isRDR;
		}
		if (resp.audioVisualizations != undefined) {
			audioVisualizations = resp.audioVisualizations;
		}
		if (resp.currentServerEndpoint != undefined) {
			currentServerEndpoint = resp.currentServerEndpoint;
		}
	});
});
