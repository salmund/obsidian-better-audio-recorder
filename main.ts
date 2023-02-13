import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Vault,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	TFile,
	moment,
	WorkspaceLeaf,
} from "obsidian";
const { clipboard } = require("electron");

export default class BetterAudioRecorderPlugin extends Plugin {
	settings: BetterAudioRecorderSettings;

	async onload() {
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"microphone",
			"Audio Recorder Interface",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new AudioRecordModal(this.app).open();
			}
		);

		this.addCommand({
			id: "BAU-open-modal",
			name: "Open Audio Recorder Interface",
			hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "[" }],
			callback: () => {
				new AudioRecordModal(this.app).open();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		// this.addSettingTab(new BetterAudioRecorderSettingTab(this.app, this));
	}

	onunload() {}

}

class AudioRecordModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		// const {titlelEl} = this;
		let audio_modal = this;
		let modal_title = contentEl.createEl("h2", {
			text: "Audio Recorder Interface",
		});
		let startRecord = contentEl.createEl("button", { text: "Record" });
		// let recordingState = contentEl.createEl("p", {
		// 	text: "Recording : inactive",
		// });
		let audio_tag = contentEl.createEl("audio");
		let line_break = contentEl.createEl("br");
		let MainDiv = contentEl.createEl("div");
		startRecord.addClass("startRecord");
		let pauseRecord = contentEl.createEl("button", { text: "Pause" });
		let stopRecord = contentEl.createEl("button", { text: "Stop" });
		pauseRecord.addClass("pauseRecord");
		stopRecord.addClass("stopRecord");
		MainDiv.appendChild(startRecord);
		MainDiv.appendChild(pauseRecord);
		MainDiv.appendChild(stopRecord);
		MainDiv.style.textAlign = "center";
		pauseRecord.setAttribute("disabled", "true"); // désactivé au départ
		stopRecord.setAttribute("disabled", "true"); // désactivé au départ

		URL = window.URL || window.webkitURL;

		let gumStream: any; //stream from getUserMedia()
		let recorder: any; //MediaRecorder object
		let chunks: any = []; //Array of chunks of audio data from the browser
		let extension: any;

		if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
			extension = "webm";
		} else {
			extension = "ogg";
		}

		startRecord.addEventListener("click", startRecording);
		stopRecord.addEventListener("click", stopRecording);
		pauseRecord.addEventListener("click", pauseRecording);

		var save_button = contentEl.createEl("button", { text: "Save" });
		var go_to_file = contentEl.createEl("button", {
			text: "Open Recording File",
		});

		MainDiv.appendChild(save_button);
		MainDiv.appendChild(go_to_file);

		save_button.style.display = "none";
		go_to_file.style.display = "none";

		function startRecording() {
			save_button.style.display = "none";
			go_to_file.style.display = "none";
			new Notice("Recording started !");

			/*
				  Simple constraints object, for more advanced audio features see
				  https://addpipe.com/blog/audio-constraints-getusermedia/
			  */

			var constraints = { audio: true };

			/*
				  Disable the record button until we get a success or fail from getUserMedia()
			  */

			startRecord.disabled = true;
			stopRecord.disabled = false;
			pauseRecord.disabled = false;

			/*
				  We're using the standard promise based getUserMedia()
				  https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
			  */

			navigator.mediaDevices
				.getUserMedia(constraints)
				.then(function (stream) {
					console.log(
						"getUserMedia() success, stream created, initializing MediaRecorder"
					);

					/*  assign to gumStream for later use  */
					gumStream = stream;

					var options = {
						audioBitsPerSecond: 256000,
						videoBitsPerSecond: 2500000,
						bitsPerSecond: 2628000,
						mimeType: "audio/" + extension + ";codecs=opus",
					};

					//update the format
					// document.getElementById("formats").innerHTML =
					//   "Sample rate: 48kHz, MIME: audio/" + extension + ";codecs=opus";

					/*
					  Create the MediaRecorder object
				  */
					recorder = new MediaRecorder(stream, options);
					console.log("recorder is now a MediaRecorder object");

					//when data becomes available add it to our array of audio data
					recorder.ondataavailable = function (e) {
						console.log("recorder.ondataavailable:" + e.data);

						console.log(
							"recorder.audioBitsPerSecond:" +
								recorder.audioBitsPerSecond
						);
						// console.log("recorder.bitsPerSecond:" + recorder.bitsPerSecond);
						// add stream data to chunks
						chunks.push(e.data);
						// if recorder is 'inactive' then recording has finished
						if (recorder.state == "inactive") {
							// convert stream data chunks to a 'webm' audio format as a blob
							var blob = new Blob(chunks, {
								type: "audio/" + extension,
								bitsPerSecond: 128000,
							});
							createDownloadLink(blob);
						}
					};

					recorder.onerror = function (e) {
						console.log(e.error);
					};

					//start recording using 1 second chunks
					//Chrome and Firefox will record one long chunk if you do not specify the chunck length
					recorder.start(1000);

					//recorder.start();
					//   recorder = null;
					//   blob = null;
					chunks = [];
				})
				.catch(function (err) {
					//enable the record button if getUserMedia() fails
					startRecord.disabled = false;
					stopRecord.disabled = true;
					pauseRecord.disabled = true;
				});
		}
		function pauseRecording() {
			console.log("pauseButton clicked recorder.state=", recorder.state);
			if (recorder.state == "recording") {
				//pause
				recorder.pause();
				pauseRecord.innerHTML = "Resume";
			} else if (recorder.state == "paused") {
				//resume
				recorder.resume();
				pauseRecord.innerHTML = "Pause";
			}
		}
		function stopRecording() {
			console.log("stopButton clicked");

			//disable the stop button, enable the record too allow for new recordings
			stopRecord.disabled = true;
			startRecord.disabled = false;
			pauseRecord.disabled = true;

			//reset button just in case the recording is stopped while paused
			pauseRecord.innerHTML = "Pause";

			//tell the recorder to stop the recording
			recorder.stop();

			//stop microphone access
			gumStream.getAudioTracks()[0].stop();
		}
		async function createDownloadLink(blob: any) {
			save_button.style.display = "inline";
			var now = moment().format("YYYYMMwebmDDHHmmss");
			var recording_filename = `Recording-${now}.${extension}`;
			var url = URL.createObjectURL(blob);
			var bau_audio_file: any;
			var audio_tfile: any;
			save_button.addEventListener("click", () => {
				blob.arrayBuffer().then((data) => {
					var blobdata = data;
					console.log(blobdata);
					audio_tfile = app.vault
						.createBinary(`/${recording_filename}`, blobdata)
						.then((data_tfile) => {
							bau_audio_file = data_tfile;
						});
					new Notice(
						`${recording_filename} saved ! Link copied to clipboard`
					);
					clipboard.writeText(`![[${recording_filename}]]`);
					go_to_file.style.display = "inline";
				});
			});
			go_to_file.addEventListener("click", () => {
				audio_modal.close();
				const active_leaf = app.workspace.activeLeaf;
				var active_leaf_view_state = active_leaf.getViewState()
				if(active_leaf_view_state.type != 'empty'){
					console.log(active_leaf_view_state.type)
					app.workspace.splitActiveLeaf().openFile(bau_audio_file);
				}
				else{
					active_leaf.openFile(bau_audio_file);
				}
			});

			// let audio_tag = contentEl.createEl("audio"); -- décommenter permet de conserver les traces des audios
			audio_tag.setAttribute("controls", "true");
			audio_tag.setAttribute("src", url);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
