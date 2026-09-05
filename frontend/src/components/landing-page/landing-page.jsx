
import {
  ArrowUpRight,
  Bookmark, Brain,
  Image,
  LayoutPanelTop,
  Link2,
  MessageSquareQuote,
  Moon,
  PenLine,
  Phone,
  Puzzle,
  Search,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";
import { Link } from "react-router-dom";

const APP_URL = "https://forgot-ai.vercel.app";

const STEPS = [
  {
    n: "01",
    icon: Bookmark,
    title: "Save",
    body: "A page, some text, or a screenshot. Drop it in and move on.",
  },
  {
    n: "02",
    icon: PenLine,
    title: "Forget organizing",
    body: "It gets a title, a summary, and a sense of meaning on its own.",
  },
  {
    n: "03",
    icon: Search,
    title: "Find later",
    body: "Search the way you remember it — or just ask your memory.",
  },
];

const SAVED = [
  { icon: Image, label: "Screenshots", hint: "The ones you meant to come back to" },
  { icon: Link2, label: "Links", hint: "Pages you didn’t want to lose" },
  { icon: Moon, label: "2 AM ideas", hint: "The thought that showed up late" },
  { icon: MessageSquareQuote, label: "Posts", hint: "Things you liked but couldn’t say why" },
  { icon: Phone, label: "Notes from calls", hint: "Already half gone by evening" },
  { icon: LayoutPanelTop, label: "UI inspiration", hint: "Something you wanted to steal, in a good way" },
];

const FAQ = [
  {
    q: "What can I save?",
    a: "A page, some text, or a screenshot. Links, notes, posts, pictures of a thing you want back later. If you can see it, you can save it.",
  },
  {
    q: "Do I need to organize folders?",
    a: "No. Forgot AI gives what you save a title, a short summary, and a sense of meaning. You find it later by remembering the idea — not the folder name.",
  },
  {
    q: "Is it private?",
    a: "Yes. What you save is private to your account.",
  },
  {
    q: "Do I need the Chrome extension?",
    a: "No. The website is enough. The extension is only for saving a page without leaving it.",
  },
  {
    q: "Is it free to try?",
    a: "Yes. Open the app and start with whatever you already have.",
  },
  {
    q: "How is this different from bookmarks?",
    a: "Bookmarks remember the address. This remembers what the thing was about, so you can search in the words you actually remember.",
  },
];

function AppLink({
  children,
  size = "default",
  className,
}: {
  children: ReactNode;
  size?: "default" | "lg";
  className?: string;
}) {
  return (
    <Button asChild size={size} className={className}>
      <Link to="/app">
        {children}
        <ArrowUpRight className="size-4" strokeWidth={2} aria-hidden="true" />
      </Link>
    </Button>
  );
}

function SearchDemo() {
  return (
    <figure className="mx-auto max-w-xl">
      <div className="rounded-xl bg-cream p-4 shadow-soft">
        <div className="flex items-center gap-3 rounded-sm bg-paper px-4 py-3 text-ink">
          <Search className="size-4 shrink-0 text-muted-lp" strokeWidth={1.75} aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm sm:text-base">
            that article about fast software
            <span className="search-caret" aria-hidden="true" />
          </p>
        </div>
        <div className="mt-3 rounded-sm bg-paper p-5">
          <p className="text-xs font-medium tracking-wide text-muted-lp">Saved page</p>
          <h3 className="mt-2 font-display text-xl font-medium tracking-tight text-ink">
            Why some software feels fast
          </h3>
          <p className="mt-2 leading-relaxed text-muted-lp">
            A short piece on latency, waiting, and why some tools feel instant even when they aren’t.
          </p>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-sm text-muted-lp">
        You type the idea. You get the thing back.
      </figcaption>
    </figure>
  );
}

export function LandingPage() {
  return (
    <div className="paper-grain relative min-h-dvh bg-paper text-ink font-sans-lp">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5 sm:h-16 sm:px-8">
          <a href="/" className="flex items-center gap-2 text-ink" aria-label="Forgot AI home">
            <span className="flex size-8 items-center justify-center rounded-sm bg-ink text-cream">
              <Brain className="size-4" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-medium tracking-tight">Forgot AI</span>
          </a>
          <AppLink>Open app</AppLink>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div>
            <p className="hero-enter text-sm font-medium tracking-wide text-muted-lp">
              For people who keep losing things they already saw
            </p>
            <h1 className="hero-enter hero-enter-delay-1 mt-4 font-display text-4xl font-medium leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Save anything now. Find it later.
            </h1>
            <p className="hero-enter hero-enter-delay-2 mt-5 max-w-xl text-lg leading-relaxed text-muted-lp">
              Drop a link, a screenshot, or a note — then find it later in the words you remember.
            </p>
            <div className="hero-enter hero-enter-delay-3 mt-8">
              <AppLink size="lg">Start saving</AppLink>
            </div>
          </div>
          <figure className="hero-enter hero-enter-delay-4">
            <img
              src="/hero.jpg"
              alt="Pencil sketch of a desk with a notebook, sticky notes, and a phone"
              width={1152}
              height={864}
              className="w-full rounded-xl shadow-soft outline outline-1 -outline-offset-1 outline-ink/10"
            />
          </figure>
        </section>

        <section className="border-t border-line">
          <Reveal className="mx-auto max-w-2xl px-5 py-16 sm:px-8 sm:py-24">
            <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
              You saved it. You just can’t find it.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-lp">
              You saw something useful. You saved it. You know you saved it. And now it is buried in bookmarks, the
              camera roll, or a doc you will never open again.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-lp">
              Forgot AI is a quieter place to put those things. Later, you type the idea in normal words. You get it
              back.
            </p>
          </Reveal>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
            <Reveal>
              <h2 className="max-w-2xl font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
                How it works
              </h2>
            </Reveal>
            <ol className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5">
              {STEPS.map((step) => (
                <Reveal key={step.n}>
                  <li className="lift h-full rounded-xl bg-cream p-6 shadow-soft">
                    <div className="flex items-center justify-between">
                      <span className="flex size-10 items-center justify-center rounded-md bg-paper text-ink">
                        <step.icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <span className="font-display text-sm tracking-wide text-muted-lp">{step.n}</span>
                    </div>
                    <h3 className="mt-6 font-display text-xl font-medium tracking-tight text-ink">{step.title}</h3>
                    <p className="mt-2 leading-relaxed text-muted-lp">{step.body}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
                Search like you remember it
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-lp">
                You will not remember the title. You will remember the idea. That is enough.
              </p>
            </Reveal>
            <Reveal className="mt-10">
              <SearchDemo />
            </Reveal>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 sm:py-24">
            <Reveal>
              <h2 className="max-w-2xl font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
                The kinds of things people save
              </h2>
            </Reveal>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SAVED.map((item) => (
                <Reveal key={item.label}>
                  <li className="lift h-full rounded-xl bg-cream p-5 shadow-soft">
                    <span className="flex size-10 items-center justify-center rounded-md bg-paper text-ink">
                      <item.icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 font-display text-lg font-medium tracking-tight text-ink">{item.label}</h3>
                    <p className="mt-1 leading-relaxed text-muted-lp">{item.hint}</p>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-line">
          <Reveal className="mx-auto max-w-2xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="rounded-xl bg-cream p-6 shadow-soft sm:p-8">
              <span className="flex size-10 items-center justify-center rounded-md bg-paper text-ink">
                <Puzzle className="size-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h2 className="mt-5 font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
                Save from any page, without leaving it
              </h2>
              <p className="mt-3 leading-relaxed text-muted-lp">
                There is a Chrome extension for one-click save while you browse. Use it when you do not want to break
                your stride. The website is still where you come back to search.
              </p>
            </div>
          </Reveal>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8 sm:py-24">
            <Reveal>
              <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
                A few quiet answers
              </h2>
            </Reveal>
            <Reveal className="mt-8">
              <Accordion type="single" collapsible className="border-t border-line">
                {FAQ.map((item) => (
                  <AccordionItem key={item.q} value={item.q}>
                    <AccordionTrigger>{item.q}</AccordionTrigger>
                    <AccordionContent>{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>

        <section className="border-t border-line">
          <Reveal className="mx-auto max-w-2xl px-5 py-20 text-center sm:px-8 sm:py-28">
            <h2 className="font-display text-4xl font-medium tracking-tight text-ink sm:text-5xl">
              Save anything now. Find it later.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-lp">
              Start with whatever is already sitting in a tab, a screenshot, or the back of your mind.
            </p>
            <div className="mt-8 flex justify-center">
              <AppLink size="lg">Start saving</AppLink>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-5 py-8 sm:flex-row sm:items-baseline sm:justify-between sm:px-8">
          <p className="font-display text-sm font-medium text-ink">Forgot AI</p>
          <p className="text-sm text-muted-lp">Private to your account.</p>
        </div>
      </footer>
    </div>
  );
}
