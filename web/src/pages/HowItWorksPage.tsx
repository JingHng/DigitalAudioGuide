import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../css/HowItWorks.css";

type Step = {
  title: string;
  desc: string;
  bullets: string[];
  icon: string; 
};

type Faq = { q: string; a: string };

export default function HowItWorksPage() {
  const steps: Step[] = useMemo(
    () => [
      {
        title: "Pick a sequenced tour",
        desc: "Choose a curated route around your campus or facility. The order is planned so you can follow it naturally.",
        bullets: ["See duration & stops", "Start anytime", "Continue later"],
        icon: "🧭",
      },
      {
        title: "Head to the first stop",
        desc: "Follow the tour sequence to your first exhibit. Each step keeps you oriented so you always know what’s next.",
        bullets: ["Clear next-step flow", "Designed for walking", "Less backtracking"],
        icon: "📍",
      },
      {
        title: "Scan the exhibit QR",
        desc: "Scan the QR code at the exhibit to unlock the content instantly. Your progress updates automatically.",
        bullets: ["Fast access", "Mobile-friendly", "Auto progress tracking"],
        icon: "🔎",
      },
      {
        title: "Explore content",
        desc: "Learn through audio, images, and descriptions. Move at your own pace — skim or deep-dive.",
        bullets: ["Audio option", "Bite-sized info", "Accessible layout"],
        icon: "🎧",
      },
      {
        title: "Collect badges (optional)",
        desc: "Get badges for completing exhibits or milestones. It’s a fun way to track how far you’ve explored.",
        bullets: ["Shows on your profile", "Milestone rewards", "Totally optional"],
        icon: "🏅",
      },
      {
        title: "Finish & review",
        desc: "Wrap up the tour, leave a review, and share feedback to help improve tours for future visitors.",
        bullets: ["Mark complete", "Leave a review", "Suggest improvements"],
        icon: "✨",
      },
    ],
    []
  );

  const faqs: Faq[] = useMemo(
    () => [
      {
        q: "Do I need an account to start a tour?",
        a: "You can browse tours without an account, but signing in helps save your progress and lets you collect badges and leave reviews.",
      },
      {
        q: "What if I can’t scan the QR code?",
        a: "Try increasing brightness and moving closer. You can also refresh and scan again.",
      },
      {
        q: "Does my progress save automatically?",
        a: "Yes — when signed in, your progress is saved as you unlock exhibit pages.",
      },
      {
        q: "Is the experience mobile-friendly?",
        a: "Yes — it’s designed for mobile first, with clear steps, readable text, and optional audio where available.",
      },
    ],
    []
  );

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="hiw">
      {/* Decorative background */}
      <div className="hiw-bg" aria-hidden="true">
        <div className="hiw-orb orb-1" />
        <div className="hiw-orb orb-2" />
        <div className="hiw-orb orb-3" />
        <div className="hiw-grid" />
      </div>

      <header className="hiw-hero">
        <div className="hiw-shell">
          <div className="hiw-heroTop">
            <div className="hiw-badge">
              <span className="hiw-dot" />
              How it works
              <span className="hiw-badgeSub">— tours in 6 simple steps</span>
            </div>
          </div>

          <div className="hiw-heroMain">
            <div className="hiw-heroCopy">
              <h1 className="hiw-title">
                Explore sequenced tours.
                <span className="hiw-titleGlow"> Scan exhibits.</span>
                Learn instantly.
              </h1>
              <p className="hiw-subtitle">
                SmartExhibit helps visitors discover exhibits around a facility
                with a clear, guided route. Follow the sequence, scan QR codes, and keep
                track of your progress — without confusion.
              </p>

              <div className="hiw-ctaRow">
                <Link to="/exhibitions" className="hiw-btn hiw-btnPrimary">
                  Browse tours
                </Link>
                <a href="#steps" className="hiw-btn hiw-btnGhost">
                  View steps
                </a>
              </div>

              <div className="hiw-miniRow">
                <div className="hiw-miniCard">
                  <div className="hiw-miniLabel">Best for</div>
                  <div className="hiw-miniValue">Campus tours, facilities, galleries</div>
                </div>
                <div className="hiw-miniCard">
                  <div className="hiw-miniLabel">What you need</div>
                  <div className="hiw-miniValue">Phone + camera (QR scan)</div>
                </div>
                <div className="hiw-miniCard">
                  <div className="hiw-miniLabel">Flow</div>
                  <div className="hiw-miniValue">Sequence → Scan → Learn → Next</div>
                </div>
              </div>
            </div>

            <div className="hiw-heroPanel" aria-hidden="true">
              <div className="hiw-panelGlow" />
              <div className="hiw-panelCard">
                <div className="hiw-panelHeader">
                  <div className="hiw-panelPill">Quick Guide</div>
                  <div className="hiw-panelTitle">Explore SmartExhibit</div>
                  <div className="hiw-panelMeta">in 6 steps</div>
                </div>

                <div className="hiw-timeline">
                  {[
                    "Pick a tour",
                    "Head to the first stop",
                    "Scan the exhibit QR",
                    "Explore content",
                    "Earn badges",
                    "Leave a review",
                  ].map((t, i) => (
                    <div key={t} className="hiw-timeItem">
                      <div className="hiw-timeLeft">
                        <div className={`hiw-timeDot ${i === 0 ? "active" : ""}`} />
                        {i !== 5 && <div className="hiw-timeLine" />}
                      </div>
                      <div className="hiw-timeText">
                        <div className="hiw-timeName">{t}</div>
                        <div className="hiw-timeHint">
                          {i === 0 ? "Start here" : "Next stop"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hiw-panelFooter">
                  <div className="hiw-panelHint">Scan QR at each stop to unlock content.</div>
                  <div className="hiw-panelChip">Auto progress</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="hiw-shell">
        <section id="steps" className="hiw-section">
          <div className="hiw-sectionHead">
            <h2 className="hiw-h2">Step-by-step guide</h2>
            <p className="hiw-p">
              A clear walkthrough of how tours work — designed for first-time visitors.
            </p>
          </div>

          <div className="hiw-steps">
            {steps.map((s, idx) => (
              <article key={s.title} className="hiw-stepCard">
                <div className="hiw-stepTop">
                  <div className="hiw-stepIcon" aria-hidden="true">
                    {s.icon}
                  </div>
                  <div className="hiw-stepNum">Step {idx + 1}</div>
                </div>

                <h3 className="hiw-h3">{s.title}</h3>
                <p className="hiw-stepDesc">{s.desc}</p>

                <ul className="hiw-stepList">
                  {s.bullets.map((b) => (
                    <li key={b} className="hiw-stepLi">
                      <span className="hiw-check" aria-hidden="true" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="hiw-section">
          <div className="hiw-sectionHead">
            <h2 className="hiw-h2">FAQ</h2>
            <p className="hiw-p">Quick answers to common visitor questions.</p>
          </div>

          <div className="hiw-faq">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <button
                  type="button"
                  key={f.q}
                  className={`hiw-faqItem ${open ? "open" : ""}`}
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                >
                  <div className="hiw-faqQ">
                    <span>{f.q}</span>
                    <span className="hiw-faqChevron" aria-hidden="true">
                      ▾
                    </span>
                  </div>
                  <div className="hiw-faqA">{f.a}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="hiw-section">
          <div className="hiw-cta">
            <div>
              <h2 className="hiw-h2">Ready to explore?</h2>
              <p className="hiw-p">
                Start with a tour — then follow the sequence and scan exhibits along the way.
              </p>
            </div>
            <div className="hiw-ctaBtns">
              <Link to="/exhibitions" className="hiw-btn hiw-btnPrimary">
                Browse tours
              </Link>
              <Link to="/register" className="hiw-btn hiw-btnGhost">
                Create account
              </Link>
            </div>
          </div>

          <p className="hiw-footnote">
            Privacy note: we store only what’s needed to improve your tour experience.
          </p>
        </section>
      </main>
    </div>
  );
}
