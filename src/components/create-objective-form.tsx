'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createObjective } from '@/actions/objectives'
import { useToast } from '@/components/ui/notification'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Plus, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

const PRESET_COLORS = [
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Cyan', value: '#06b6d4' },
]

export default function CreateObjectiveForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].value)
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const toast = useToast()
  const t = useTranslations('Forms.Objectives')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(event.currentTarget)
      await createObjective(formData)

      toast({
        title: t('successTitle'),
        description: t('successDesc'),
        variant: 'success',
      })

      setName('')
      setSelectedColor(PRESET_COLORS[0].value)
      setIsOpen(false)
      router.refresh()
    } catch (error) {
      toast({
        title: t('errorTitle'),
        description: (error as Error)?.message || t('errorDesc'),
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full h-full min-h-[88px]"
      >
        <Card className="flex h-full items-center justify-center gap-2 border-2 border-dashed border-border p-4 transition-all duration-200 hover:border-primary/40 hover:bg-muted/50 cursor-pointer">
          <Plus className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {t('newObjective')}
          </span>
        </Card>
      </button>
    )
  }

  return (
    <Card className="col-span-full p-5 border-2 border-primary/20 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{t('createTitle')}</h4>
          <p className="text-xs text-muted-foreground">{t('createSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="name" className="text-sm font-medium text-foreground">
            {t('name')}
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder={t('namePlaceholder')}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground">{t('color')}</Label>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setSelectedColor(color.value)}
                className={`h-8 w-8 rounded-full border-2 transition-all duration-150 hover:scale-110 ${
                  selectedColor === color.value
                    ? 'border-foreground scale-110 shadow-sm'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
            <div className="ml-1 h-6 w-px bg-border" />
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
              title={t('customColor')}
            />
          </div>
          <input type="hidden" name="color" value={selectedColor} />
        </div>

        <Button type="submit" className="w-full" size="sm" disabled={isSubmitting}>
          <Plus className="h-4 w-4 mr-1.5" />
          {isSubmitting ? t('creating') : t('createBtn')}
        </Button>
      </form>
    </Card>
  )
}
