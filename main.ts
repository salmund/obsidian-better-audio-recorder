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
} from "obsidian";
const { clipboard } = require("electron");
import moment from "moment";

interface BetterAudioRecorderSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: BetterAudioRecorderSettings = {
	mySetting: "default",
};

export default class BetterAudioRecorderPlugin extends Plugin {
	settings: BetterAudioRecorderSettings;

	async onload() {
		await this.loadSettings();
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

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class AudioRecordModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		// const {titlelEl} = this;
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

		var gumStream: any; //stream from getUserMedia()
		var recorder: any; //MediaRecorder object
		var chunks: any = []; //Array of chunks of audio data from the browser
		var extension: any;

		var recordButton = document.getElementsByClassName("startRecord")[0];
		var stopButton = document.getElementsByClassName("stopRecord")[0];
		var pauseButton = document.getElementsByClassName("pauseRecord")[0];

		console.log(
			"audio/webm:" +
				MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
		);
		// false on chrome, true on firefox
		console.log(
			"audio/ogg:" +
				MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
		);

		if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
			extension = "webm";
		} else {
			extension = "ogg";
		}

		recordButton.addEventListener("click", startRecording);
		stopButton.addEventListener("click", stopRecording);
		pauseButton.addEventListener("click", pauseRecording);

		var save_button = contentEl.createEl("button", { text: "Save" });
		MainDiv.appendChild(save_button);
		save_button.style.display = "none";

		function startRecording() {
			save_button.style.display = "none";
			new Notice("Recording started !");
			console.log("recordButton clicked");

			/*
				  Simple constraints object, for more advanced audio features see
				  https://addpipe.com/blog/audio-constraints-getusermedia/
			  */

			var constraints = { audio: true };

			/*
				  Disable the record button until we get a success or fail from getUserMedia()
			  */

			recordButton.disabled = true;
			stopButton.disabled = false;
			pauseButton.disabled = false;

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
					recordButton.disabled = false;
					stopButton.disabled = true;
					pauseButton.disabled = true;
				});
		}
		function pauseRecording() {
			console.log("pauseButton clicked recorder.state=", recorder.state);
			if (recorder.state == "recording") {
				//pause
				recorder.pause();
				pauseButton.innerHTML = "Resume";
			} else if (recorder.state == "paused") {
				//resume
				recorder.resume();
				pauseButton.innerHTML = "Pause";
			}
		}
		function stopRecording() {
			console.log("stopButton clicked");

			//disable the stop button, enable the record too allow for new recordings
			stopButton.disabled = true;
			recordButton.disabled = false;
			pauseButton.disabled = true;

			//reset button just in case the recording is stopped while paused
			pauseButton.innerHTML = "Pause";

			//tell the recorder to stop the recording
			recorder.stop();

			//stop microphone access
			gumStream.getAudioTracks()[0].stop();
		}
		async function createDownloadLink(blob: any) {
			save_button.style.display = "inline";
			var now = moment().format("YYYYMMwebmDDHHmm");
			let recording_filename = `Recording-${now}.${extension}`;
			var url = URL.createObjectURL(blob);

			save_button.addEventListener("click", () => {
				blob.arrayBuffer().then((data) => {
					let blobdata = data;
					console.log(blobdata);
					app.vault.createBinary(`/${recording_filename}`, blobdata);
					new Notice(
						`${recording_filename} saved ! Link copied to clipboard`
					);
					clipboard.writeText(`![[${recording_filename}]]`);
				});
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

// class BetterAudioRecorderSettingTab extends PluginSettingTab {
// 	plugin: BetterAudioRecorderPlugin;

// 	constructor(app: App, plugin: BetterAudioRecorderPlugin) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const { containerEl } = this;

// 		containerEl.empty();

// 		containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

// 		new Setting(containerEl)
// 			.setName("Setting #1")
// 			.setDesc("It's a secret")
// 			.addText((text) =>
// 				text
// 					.setPlaceholder("Enter your secret")
// 					.setValue(this.plugin.settings.mySetting)
// 					.onChange(async (value) => {
// 						console.log("Secret: " + value);
// 						this.plugin.settings.mySetting = value;
// 						await this.plugin.saveSettings();
// 					})
// 			);
// 	}
// }
