# Custom YouTube Playback & Rotation

> A minimal, open-source browser extension that adds a sleek speed & rotation control directly inside the YouTube's player UI.

![Firefox](https://img.shields.io/badge/Firefox-Manifest_V2-orange?logo=firefox-browser&logoColor=white)
![Chrome](https://img.shields.io/badge/Chrome-Manifest_V3-blue?logo=google-chrome&logoColor=white)
![Version](https://img.shields.io/badge/Version-1.0.0-purple)
![License](https://img.shields.io/badge/License-GPLv3-blue)


## Features

- **Custom playback speed**: Switch between `0.25x` to `3x` with one click or, manually enter any speed from `0.05x` to `16x`
- **Video rotation**: Rotate the YouTube player to `0°`, `90°`, `180°`, or `270°`
- **Persistent settings** Remembers your last speed and rotation across videos and sessions
- **Zero tracking**: No data collection, no external requests, no telemetry


## Screenshots

<table>
  <tr>
    <td align="center">
      <img width="540" alt="Extension icon blended directly into YouTube's Media Player" src="https://github.com/user-attachments/assets/74f12f6a-4be6-4f99-8be2-07058dd49159" />
      <br/>
      <em>Extension icon blended directly into YouTube's Media Player.</em>
    </td>
    <td align="center">
      <img width="540" alt="Showcasing all the options available with the extension" src="https://github.com/user-attachments/assets/7cfce8b6-9066-4299-a194-05225c239297" />
      <br/>
      <em>Showcasing all the options available with the extension.</em>
    </td>
  </tr>
</table>


## Installation

### Firefox (via Add-ons Store)

Install directly from the official
**[Mozilla Add-ons store](https://addons.mozilla.org/en-US/firefox/addon/custom-yt-playback-rotation/)**


### Firefox (Manual / Developer)

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on...**
4. Select the `manifest.json` file inside the `Firefox/` folder
5. Open any YouTube video — the control will appear next to the CC button


### Chrome (Unpacked — Free)

> The Chrome extension is not listed on the Chrome Web Store (the store charges a one-time developer fee). You can still install it for free as an unpacked extension:

1. Download or clone this repository
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `Chrome/` folder (the one containing `manifest.json`)

## Permissions

| Permission | Reason |
|---|---|
| `storage` | Saves your speed and rotation preferences locally on your device |
| `*://www.youtube.com/*` | Required to inject the control into the YouTube player |



## How It Works

The extension injects a small content script into YouTube pages. It:

1. Finds the YouTube player's right-side controls bar
2. Inserts a custom button next to the CC/Subtitles button
3. Manages playback rate via the HTML5 video API
4. Applies CSS `transform: rotate()` for video rotation
5. Persists your preferences using the browser's local storage API


## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
