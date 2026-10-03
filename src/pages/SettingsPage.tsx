import {
  Button,
  Description,
  Input,
  Label,
  ListBox,
  Radio,
  RadioGroup,
  Select,
  TextField,
} from '@heroui/react'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Brand } from '../app/Brand'
import { ThemeToggle } from '../app/ThemeToggle'
import { PERSONALITIES, type PersonalityId } from '../interviewer/personalities'
import type { SessionMode } from '../interviewer/prompts'
import { chat, listModels } from '../llm/client'
import { PROVIDERS, getProvider, type ProviderId } from '../llm/providers'
import { baseUrlFor, llmConfigFrom, updateSettings, useSettings } from '../settings/settings'

type Status = { kind: 'idle' | 'busy' | 'ok' | 'error'; text: string }

const IDLE: Status = { kind: 'idle', text: '' }

const MODES: { id: SessionMode; label: string; description: string }[] = [
  {
    id: 'interview',
    label: 'Interview',
    description: 'Realistic: the interviewer answers clarifying questions and gives no hints.',
  },
  {
    id: 'practice',
    label: 'Practice',
    description: 'When you are stuck, the interviewer may name an area to think about.',
  },
]

function Section(props: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="bg-surface shadow-float rounded-3xl p-6">
      <h2 className="text-base font-semibold tracking-tight">{props.title}</h2>
      <p className="text-muted mt-1 text-sm">{props.description}</p>
      <div className="mt-5 flex flex-col gap-5">{props.children}</div>
    </section>
  )
}

export function SettingsPage() {
  const navigate = useNavigate()
  const settings = useSettings()
  const provider = getProvider(settings.provider)
  const apiKey = settings.apiKeys[settings.provider] ?? ''
  const model = settings.models[settings.provider] ?? ''
  const baseUrl = baseUrlFor(settings)

  const [showKey, setShowKey] = useState(false)
  const [modelOptions, setModelOptions] = useState<string[]>([])
  const [status, setStatus] = useState<Status>(IDLE)

  const setApiKey = (value: string) =>
    updateSettings({ apiKeys: { ...settings.apiKeys, [settings.provider]: value } })
  const setModel = (value: string) =>
    updateSettings({ models: { ...settings.models, [settings.provider]: value } })

  const changeProvider = (id: ProviderId) => {
    updateSettings({ provider: id })
    setModelOptions([])
    setStatus(IDLE)
  }

  const loadModels = async () => {
    setStatus({ kind: 'busy', text: 'Loading models…' })
    try {
      const models = await listModels({ baseUrl, apiKey: apiKey.trim() })
      setModelOptions(models)
      setStatus({
        kind: 'ok',
        text: `${models.length} models found. Pick one from the model field's suggestions.`,
      })
    } catch (cause) {
      setStatus({ kind: 'error', text: cause instanceof Error ? cause.message : 'Failed.' })
    }
  }

  const testConnection = async () => {
    const config = llmConfigFrom(settings)
    if (!config) return
    setStatus({ kind: 'busy', text: 'Sending a test message…' })
    try {
      await chat(config, [{ role: 'user', content: 'Reply with the single word: ready' }])
      setStatus({ kind: 'ok', text: 'Connected. The interviewer is ready to use this model.' })
    } catch (cause) {
      setStatus({ kind: 'error', text: cause instanceof Error ? cause.message : 'Failed.' })
    }
  }

  const canLoadModels = baseUrl !== '' && (settings.provider === 'custom' || apiKey.trim() !== '')

  return (
    <div className="dot-grid h-full overflow-y-auto">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Brand />
        <ThemeToggle />
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-5 pb-20">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2" onPress={() => void navigate('/')}>
            <ArrowLeft className="size-4" />
            Home
          </Button>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted mt-1 text-sm">Saved automatically in this browser.</p>
        </div>

        <Section
          title="AI provider"
          description="Wytboard uses your own API key. It is stored only in this browser and sent only to the provider you choose."
        >
          <Select
            className="w-full"
            value={settings.provider}
            onChange={(key) => changeProvider(key as ProviderId)}
          >
            <Label>Provider</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {PROVIDERS.map((option) => (
                  <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
                    {option.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          {settings.provider === 'custom' && (
            <TextField
              className="w-full"
              value={settings.customBaseUrl}
              onChange={(value) => updateSettings({ customBaseUrl: value })}
            >
              <Label>Base URL</Label>
              <Input placeholder="http://localhost:11434/v1" />
              <Description>Any OpenAI-compatible endpoint, such as a local Ollama server.</Description>
            </TextField>
          )}

          <TextField className="w-full" value={apiKey} onChange={setApiKey}>
            <Label>API key</Label>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                type={showKey ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                placeholder="Paste your key here"
              />
              <Button
                isIconOnly
                variant="tertiary"
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
                onPress={() => setShowKey((shown) => !shown)}
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
            <Description>
              {provider.keyUrl ? (
                <>
                  Get a key from{' '}
                  <a
                    href={provider.keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent font-medium underline-offset-4 hover:underline"
                  >
                    {new URL(provider.keyUrl).host}
                  </a>
                  .
                </>
              ) : (
                'Leave empty if your server does not need one.'
              )}
            </Description>
          </TextField>

          <TextField className="w-full" value={model} onChange={setModel}>
            <Label>Model</Label>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                list="model-options"
                autoComplete="off"
                spellCheck={false}
                placeholder="Model name"
              />
              <Button
                variant="tertiary"
                isDisabled={!canLoadModels || status.kind === 'busy'}
                onPress={() => void loadModels()}
              >
                Load models
              </Button>
            </div>
            <datalist id="model-options">
              {modelOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <Description>
              Choose a model that accepts images, so the interviewer can read your board.
            </Description>
          </TextField>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              isDisabled={!llmConfigFrom(settings) || status.kind === 'busy'}
              onPress={() => void testConnection()}
            >
              Test connection
            </Button>
            <p
              role="status"
              className={`text-sm ${
                status.kind === 'error'
                  ? 'text-danger'
                  : status.kind === 'ok'
                    ? 'text-success'
                    : 'text-muted'
              }`}
            >
              {status.text}
            </p>
          </div>
        </Section>

        <Section
          title="Interviewer"
          description="How the interviewer behaves in new messages. You can change this at any time."
        >
          <RadioGroup
            variant="secondary"
            value={settings.personality}
            onChange={(value) => updateSettings({ personality: value as PersonalityId })}
          >
            <Label>Personality</Label>
            {PERSONALITIES.map((option) => (
              <Radio key={option.id} value={option.id}>
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <Label>{option.label}</Label>
                </Radio.Content>
                <Description>{option.description}</Description>
              </Radio>
            ))}
          </RadioGroup>

          <RadioGroup
            variant="secondary"
            value={settings.mode}
            onChange={(value) => updateSettings({ mode: value as SessionMode })}
          >
            <Label>Mode</Label>
            {MODES.map((option) => (
              <Radio key={option.id} value={option.id}>
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <Label>{option.label}</Label>
                </Radio.Content>
                <Description>{option.description}</Description>
              </Radio>
            ))}
          </RadioGroup>
        </Section>
      </main>
    </div>
  )
}
