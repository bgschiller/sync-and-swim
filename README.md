# sync-and-swim

An app for loading Shokz OpenSwim headphones with music and audiobooks.

## How to use the app

![Sync and Swim main screen](./images/sync-and-swim-main.png)

There are three functions offered by the app:

1. **Load music** - Add music files to the headphones. The files are copied to the headphones, taking care that the file system timestamps match the alphabetical order of the files. This is important because the headphones play the files in the order of the timestamps.
2. **Cut audio files** - Cut audio files to a specific length. This is useful for cutting audiobooks into smaller parts that are easier to listen to during a swim. Otherwise, you may miss a part of the book and be unable to rewind by just a bit.
3. **Find your place** - Find your place in an audiobook. Sometimes the headphones turn on in your bag and you lose your spot. This feature helps you find your place in the book, then delete the files you've already listened to.

### Load music

![Load music screen](./images/load-music.png)

I find it useful to keep a folder on my laptop called "swimming-staging-area". I fill this folder with the music and audiobooks that I'll want to transfer. I can rename the folders so they show up in the order I want.

Each folder can be individually shuffled or sorted by name. The headphones also have a shuffle feature, but it's not one of the button combinations I've memorized, so this was easier for me. In this case, the shuffling happens once, at the time of transfer. Subsequent plays of the same folder will be in the same shuffled order.

You can optionally have the app delete the files from the destination before copying the new ones over. The default is to leave existing files in place, adding the new ones after any that were already there.

### Cut audio files

![Split audio screen](./images/split-audio.png)

With only three buttons and no screen, there's no function on the OpenSwim headphones to skip back a few seconds. This can be frustrating when you're listening to an audiobook and you miss a bit.

This function of the app allows you to cut audio files into smaller pieces. There's a slight stutter when the headphones switch from one file to the next, but the app will try to identify silent points in the audio and cut there.

> Note: This function requires that [ffmpeg](https://www.ffmpeg.org/download.html) is installed and available on your PATH. You'll see an error message if it can't be found.

### Find your place

![Find your place screen](./images/find-your-place.png)

It's hard to know how far along you are in an audiobook on a device with no screen. If you lose your spot, you can use this tool to find where you left off. It proposes a sequence of files to listen to, and you click either "Yes, I remember this", "No, I don't remember this", or "Not sure". The app performs a binary search to find the right spot.

Once you've found the earliest-not-yet-completed file, you can optionally delete the earlier tracks.

This works best on audiobooks that are split into smaller pieces (with the "Cut audio files" function). If you have a handful of long files, the best this will do is find the right one.

## How to build

This project is built using [Tauri](https://v2.tauri.app/). Follow the [Prerequisites instructions on the Tauri website](https://v2.tauri.app/start/prerequisites/) to install Rust and Node.js.

Once you have those installed, run

```sh
corepack enable
pnpm install
pnpm tauri dev
```

This will start a hot-reloading development server. You can build the app for distribution with

```sh
pnpm tauri build
```

## Contributing

This app is a side project for no money. I'm happy to accept pull requests and even feature requests, but no promises about when they'll be integrated. Some areas where I'd love help:

- Testing on Windows and Linux. I've only tried this on my Mac. Please add to these instructions if there are pieces missing.
- A better logo. This one is ugly, and looks out of place in the mac dock without rounded corners.
- Use ffmpeg via an FFI instead of a child process. I couldn't figure out how to make that work, but it would be nice to lift the requirement that a user has ffmpeg installed.
- Figure out code signing for the Mac and Windows apps. Whatever we can do (short of paying $99/year) to make the app easier to install for laypeople would be great.
- Make it prettier. I think this design is O-kay but not great. I'm not at all bothered if you can make improvements.
