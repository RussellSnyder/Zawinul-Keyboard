document.addEventListener("DOMContentLoaded", function () {
  const audioContext = new AudioContext();
  const oscList = [];
  let mainGainNode = null;
  let showNoteNames = true;
  const $keyboard = document.querySelector(".keyboard");
  const wavePicker = document.querySelector("select[name='waveform']");
  const keyArrangement = document.querySelector(
    "select[name='keyArrangement']"
  );
  const $showNoteNames = document.querySelector("input[name='shownotenames']");
  $showNoteNames.checked = showNoteNames;
  const volumeControl = document.querySelector("input[name='volume']");
  let customWaveform = null;
  let sineTerms = null;
  let cosineTerms = null;
  function createNoteTable() {
    const noteFreq = [
      { A: 27.5, "A#": 29.13523509488062, B: 30.867706328507754 },
      {
        C: 32.70319566257483,
        "C#": 34.64782887210901,
        D: 36.70809598967595,
        "D#": 38.89087296526011,
        E: 41.20344461410874,
        F: 43.65352892912549,
        "F#": 46.2493028389543,
        G: 48.99942949771866,
        "G#": 51.91308719749314,
        A: 55,
        "A#": 58.27047018976124,
        B: 61.73541265701551,
      },
    ];
    for (let octave = 2; octave <= 7; octave++) {
      noteFreq.push(
        Object.fromEntries(
          Object.entries(noteFreq[octave - 1]).map(([key, freq]) => [
            key,
            freq * 2,
          ])
        )
      );
    }
    noteFreq.push({ C: 4186.009044809578 });
    return noteFreq;
  }
  function setup() {
    const noteFreq = createNoteTable();

    volumeControl.addEventListener("change", changeVolume);
    $showNoteNames.addEventListener("change", toggleShowNoteNames);

    mainGainNode = audioContext.createGain();
    mainGainNode.connect(audioContext.destination);
    mainGainNode.gain.value = volumeControl.value;

    // Create the keys; skip any that are sharp or flat; for
    // our purposes we don't need them. Each octave is inserted
    // into a <div> of class "octave".
    $keyboard.replaceChildren();

    noteFreq.forEach((keys, idx) => {
      const keyList = Object.entries(keys);
      const octaveElem = document.createElement("div");
      octaveElem.className = "octave";

      keyList.forEach((key) => {
        if (key[0].length === 1) {
          octaveElem.appendChild(createKey(key[0], idx, key[1]));
        }
      });

      $keyboard.appendChild(octaveElem);
    });

    document
      .querySelector("div[data-note='B'][data-octave='5']")
      .scrollIntoView(false);

    sineTerms = new Float32Array([0, 0, 1, 0, 1]);
    cosineTerms = new Float32Array(sineTerms.length);
    customWaveform = audioContext.createPeriodicWave(cosineTerms, sineTerms);

    for (let i = 0; i < 9; i++) {
      oscList[i] = {};
    }
  }

  setup();
  function createKey(note, octave, freq) {
    const keyElement = document.createElement("div");
    const labelElement = document.createElement("div");

    keyElement.className = "key";
    keyElement.dataset["octave"] = octave;
    keyElement.dataset["note"] = note;
    keyElement.dataset["frequency"] = freq;
    if (showNoteNames) {
      labelElement.appendChild(document.createTextNode(note));
      labelElement.appendChild(document.createElement("sub")).textContent =
        octave;
    }
    keyElement.appendChild(labelElement);

    keyElement.addEventListener("mousedown", notePressed);
    keyElement.addEventListener("mouseup", noteReleased);
    keyElement.addEventListener("mouseover", notePressed);
    keyElement.addEventListener("mouseleave", noteReleased);

    return keyElement;
  }
  function playTone(freq) {
    const osc = audioContext.createOscillator();
    osc.connect(mainGainNode);

    const type = wavePicker.options[wavePicker.selectedIndex].value;

    if (type === "custom") {
      osc.setPeriodicWave(customWaveform);
    } else {
      osc.type = type;
    }

    osc.frequency.value = freq;
    osc.start();

    return osc;
  }
  function notePressed(event) {
    if (event.buttons & 1) {
      const dataset = event.target.dataset;

      if (!dataset["pressed"] && dataset["octave"]) {
        const octave = Number(dataset["octave"]);
        oscList[octave][dataset["note"]] = playTone(dataset["frequency"]);
        dataset["pressed"] = "yes";
      }
    }
  }
  function noteReleased(event) {
    const dataset = event.target.dataset;

    if (dataset && dataset["pressed"]) {
      const octave = Number(dataset["octave"]);

      if (oscList[octave] && oscList[octave][dataset["note"]]) {
        oscList[octave][dataset["note"]].stop();
        delete oscList[octave][dataset["note"]];
        delete dataset["pressed"];
      }
    }
  }
  function changeVolume(event) {
    mainGainNode.gain.value = volumeControl.value;
  }
  function toggleShowNoteNames() {
    showNoteNames = !showNoteNames;
    setup();
  }
  const synthKeys = document.querySelectorAll(".key");
  // prettier-ignore
  const keyCodes = [
  "Space",
  "ShiftLeft", "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash", "ShiftRight",
  "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote", "Enter",
  "Tab", "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight",
  "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal", "Backspace",
  "Escape",
];
  function keyNote(event) {
    const elKey = synthKeys[keyCodes.indexOf(event.code)];
    if (elKey) {
      if (event.type === "keydown") {
        elKey.tabIndex = -1;
        elKey.focus();
        elKey.classList.add("active");
        notePressed({ buttons: 1, target: elKey });
      } else {
        elKey.classList.remove("active");
        noteReleased({ buttons: 1, target: elKey });
      }
      event.preventDefault();
    }
  }
  addEventListener("keydown", keyNote);
  addEventListener("keyup", keyNote);

  // Your code goes here
});
