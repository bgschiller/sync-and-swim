import { open } from "@tauri-apps/plugin-shell";

export default function About() {
  return (
    <div className="about-page">
      <h1>About Sync + Swim</h1>
      <p>
        My dad and I each have a pair of Shokz OpenSwim headphones. I put some
        audiobooks on them, but the process involved some steps that required
        some of my programming skills. When he would finish a book or lose his
        place, he wasn't able to fix it himself. People at the gym sometimes ask
        me about the headphones and I recommend them, but have to warn about how
        difficult it can be to manage the audio files.
      </p>
      <p>
        I created this app in the spirit of "
        <a
          href="#"
          onClick={() =>
            open("https://www.robinsloan.com/notes/home-cooked-app/")
          }
        >
          an app can be a home-cooked meal
        </a>
        ": it can serve an audience of about five people and make no money. I
        hope it helps you enjoy your swim ❤️
      </p>
      <p>
        If you have suggestions or feedback, you can reach me at{" "}
        <a href="mailto:bgschiller@gmail.com">bgschiller@gmail.com</a>. The code
        is open source on{" "}
        <a
          href="#"
          onClick={() => open("https://github.com/bgschiller/sync-and-swim")}
        >
          GitHub
        </a>
        .
      </p>
    </div>
  );
}
