/* =============================================================================
   Sādhana — Content
   -----------------------------------------------------------------------------
   This is the ONLY file Shraddha needs to edit to add new content.
   Everything on the site is generated from the data below.

   HOW TO ADD A NEW BLOG POST
   --------------------------
   Copy one block inside `blog: [ ... ]` and change the fields. Newest first.
   The `body` can be written as plain paragraphs separated by a blank line,
   and you can use **bold**, *italic*, and > for a quote line.

   HOW TO ADD A NEW VIDEO
   ----------------------
   Add a block inside `videos: [ ... ]`. For YouTube, just paste the video id
   (the part after watch?v=  e.g. dQw4w9WgXcQ) into `youtube`.

   HOW TO ADD A THOUGHT
   --------------------
   A short reflection. Add a block inside `thoughts: [ ... ]`.

   TIP: keep `slug` lowercase-with-dashes and unique — it becomes the link.
   ============================================================================= */

window.SADHANA_CONTENT = {

  /* ------------------------------------------------------------------ Profile */
  site: {
    brand: "Sādhana",
    teacher: "Shraddha",
    tagline: "Practice with devotion.",
    intro:
      "A quiet corner of the internet for breath, movement and stillness — " +
      "writings, practices and reflections from my own mat to yours.",
    email: "hello@sadhana.yoga",
    social: {
      instagram: "https://instagram.com/",
      youtube: "https://youtube.com/",
    },
  },

  /* --------------------------------------------------------------------- Blog */
  blog: [
    {
      slug: "the-meaning-of-shraddha",
      title: "On Śraddhā — the Faith Beneath the Practice",
      date: "2026-05-28",
      readingTime: 5,
      category: "Philosophy",
      excerpt:
        "Before the first breath, before the first pose, there is śraddhā — " +
        "a quiet, unwavering trust. This is where every practice truly begins.",
      cover: "lotus",
      body: `In the Yoga Sūtras, Patañjali names *śraddhā* as the very first quality a seeker carries onto the mat. Not strength. Not flexibility. **Faith.**

It is not a loud, certain faith. It is the soft willingness to return — to breathe again, to begin again, to trust that the practice is doing its quiet work even on the mornings it feels like nothing is happening.

> Śraddhā is the seed. Everything that grows in a practice grows from it.

When I named this little home *Sādhana*, I was thinking about this. A sādhana is a daily, devoted practice — and devotion is only possible where there is faith. The two are inseparable. So really, this whole space is one word said twice: practice, with devotion.

If you are new here, I hope you find permission to begin gently. You do not need to be flexible. You do not need to be calm. You only need to be willing to show up, breathe, and trust.

That willingness — that is already yoga.`,
    },
    {
      slug: "a-morning-practice-for-busy-days",
      title: "A 10-Minute Morning Practice for Busy Days",
      date: "2026-05-14",
      readingTime: 4,
      category: "Practice",
      excerpt:
        "On the days when there is no time, ten honest minutes is more than " +
        "enough. Here is the short sequence I return to again and again.",
      cover: "sunrise",
      body: `Some mornings the day starts before you do. The list is already long, the mind is already running. These are exactly the mornings a short practice matters most.

Here is the sequence I come back to. Move slowly, let the breath lead.

**1. Seated breathing — 2 minutes.** Sit tall. Inhale for four counts, exhale for six. Longer exhales tell the nervous system: you are safe.

**2. Cat–Cow — 1 minute.** On hands and knees, arch and round with the breath. Wake the spine.

**3. Downward Dog to Forward Fold — 2 minutes.** Pedal the feet, then walk the hands back and hang. Let the head be heavy.

**4. Low Lunge, both sides — 2 minutes.** Open the hips and the front of the body. Reach the heart forward.

**5. Standing Mountain — 1 minute.** Feel the ground. Feel tall. Feel ready.

**6. Stillness — 2 minutes.** Stand or sit. Do nothing. Notice that you already feel different.

> Ten minutes given with attention is worth more than an hour given with a wandering mind.

That's it. No mat required, no special clothes. Just you, your breath, and a little devotion to start the day kindly.`,
    },
    {
      slug: "what-stillness-taught-me",
      title: "What Stillness Taught Me About Strength",
      date: "2026-04-30",
      readingTime: 6,
      category: "Reflections",
      excerpt:
        "For years I thought a strong practice meant a hard one. Stillness " +
        "gently, stubbornly, taught me otherwise.",
      cover: "stone",
      body: `For a long time I measured my practice by effort. Sweat, intensity, the difficult pose finally held. If it was hard, it counted.

Then a season came when hard wasn't available to me. I was tired in a way movement couldn't fix. And so I sat. I learned to be still — not as a reward at the end of practice, but as the practice itself.

What I found surprised me. **Stillness is not the absence of strength. It is a different kind of it.**

To stay seated while the mind begs you to get up. To keep breathing slowly while everything inside speeds up. To meet discomfort without fixing it. This asks more of me than any arm balance ever has.

> The strongest thing I do all day is often the moment I choose not to move.

I still love a strong, sweaty flow. But I no longer believe that's where the real strength lives. The real strength is quieter. It's the capacity to stay — with your breath, with this moment, with yourself — exactly as things are.

That is what stillness taught me. And it is, I think, the whole point.`,
    },
  ],

  /* ------------------------------------------------------------------- Videos */
  videos: [
    {
      slug: "gentle-morning-flow",
      title: "Gentle Morning Flow",
      duration: "18 min",
      level: "All levels",
      date: "2026-05-20",
      description:
        "A slow, kind flow to wake the body and meet the day with a soft, " +
        "open heart. Perfect with your first cup of tea.",
      youtube: "", // paste a YouTube video id here, e.g. "dQw4w9WgXcQ"
      poster: "sunrise",
    },
    {
      slug: "evening-wind-down",
      title: "Evening Wind-Down for Deep Rest",
      duration: "25 min",
      level: "Beginner",
      date: "2026-05-06",
      description:
        "Long, supported holds and slow breathing to release the day and " +
        "prepare the body for deep, restful sleep.",
      youtube: "",
      poster: "moon",
    },
    {
      slug: "breath-and-balance",
      title: "Breath & Balance — A Standing Practice",
      duration: "30 min",
      level: "Intermediate",
      date: "2026-04-18",
      description:
        "Build steadiness from the ground up. A grounding standing sequence " +
        "linking breath to balance, strength to ease.",
      youtube: "",
      poster: "mountain",
    },
  ],

  /* ----------------------------------------------------------------- Thoughts */
  thoughts: [
    {
      date: "2026-06-01",
      text:
        "The breath is always now. Whenever you are lost, it is the way home.",
    },
    {
      date: "2026-05-19",
      text:
        "You are not behind. There is no schedule the soul is keeping. Begin " +
        "where you are.",
    },
    {
      date: "2026-05-03",
      text:
        "Flexibility of the body is a small gift. Flexibility of the mind is " +
        "the whole practice.",
    },
    {
      date: "2026-04-21",
      text:
        "Some days the practice is the pose. Some days the practice is being " +
        "gentle with yourself for not getting to the mat. Both are yoga.",
    },
  ],
};
