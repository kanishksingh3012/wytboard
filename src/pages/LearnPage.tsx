import { Button } from '@heroui/react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Brand } from '../app/Brand'
import { ThemeToggle } from '../app/ThemeToggle'
import { SECTIONS, type Block } from '../learn/content'

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return <p className="text-sm leading-relaxed">{block.text}</p>
    case 'sub':
      return <h3 className="pt-2 text-sm font-semibold">{block.text}</h3>
    case 'tip':
      return (
        <p className="border-accent bg-accent/5 rounded-r-xl border-l-2 px-4 py-3 text-sm leading-relaxed">
          {block.text}
        </p>
      )
    case 'list':
      return (
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
  }
}

export function LearnPage() {
  const navigate = useNavigate()

  // The router uses the URL hash, so in-page links scroll by hand.
  const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="bg-background h-full overflow-y-auto">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Brand />
        <ThemeToggle />
      </header>

      <div className="mx-auto max-w-5xl px-5 pb-20">
        <Button variant="ghost" size="sm" className="-ml-2" onPress={() => void navigate('/')}>
          <ArrowLeft className="size-4" />
          Home
        </Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Learn whiteboarding</h1>
        <p className="text-muted mt-1 max-w-2xl text-sm">
          A way to work through any whiteboard design challenge, step by step. Read it once, then
          practise; the timings are a rough guide, not a rule.
        </p>

        <div className="mt-8 flex flex-col gap-8 md:flex-row">
          <nav aria-label="Contents" className="md:sticky md:top-4 md:w-56 md:shrink-0 md:self-start">
            <ol className="flex gap-1 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
              {SECTIONS.map((section) => (
                <li key={section.id} className="shrink-0">
                  <button
                    type="button"
                    className="text-muted hover:bg-default hover:text-foreground w-full cursor-pointer rounded-lg px-3 py-1.5 text-left text-sm whitespace-nowrap md:whitespace-normal"
                    onClick={() => jumpTo(section.id)}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <main className="flex min-w-0 flex-1 flex-col gap-5">
            {SECTIONS.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="bg-surface shadow-float scroll-mt-4 rounded-3xl p-6"
              >
                <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
                <div className="mt-3 flex flex-col gap-3">
                  {section.blocks.map((block, index) => (
                    <BlockView key={index} block={block} />
                  ))}
                </div>
              </section>
            ))}

            <div>
              <Button variant="primary" onPress={() => void navigate('/')}>
                Start practising
              </Button>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
