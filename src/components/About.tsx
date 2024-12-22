import { open } from "@tauri-apps/plugin-shell";

export default function About() {
  return (
    <div className="about-page">
      <h1>About Swim Headphones Transfer</h1>
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
        ". I wanted to make something that was easy to use, and that I could
        share with my dad and others. I hope it helps you enjoy your audiobooks
        and podcasts more!
      </p>
    </div>
  );
}
