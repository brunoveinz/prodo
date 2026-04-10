'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Objective } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/notification'
import { Target, ChevronRight, Trash2, Palette, Pencil } from 'lucide-react'
import CreateObjectiveForm from './create-objective-form'
import { deleteObjective, updateObjectiveColor, updateObjectiveName } from '@/actions/objectives'
import { useTranslations } from 'next-intl'

const PRESET_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4',
]

interface ObjectiveSelectorProps {
  objectives: Objective[]
  selectedId?: string
}

export default function ObjectiveSelector({
  objectives,
  selectedId,
}: ObjectiveSelectorProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [colorPickerId, setColorPickerId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editNameId, setEditNameId] = useState<string | null>(null)
  const [editNameValue, setEditNameValue] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const toast = useToast()
  const t = useTranslations('Selector.Objectives')

  function handleDelete(objectiveId: string) {
    startTransition(async () => {
      await deleteObjective(objectiveId)
      toast({ title: t('deleted'), variant: 'success' })
      setConfirmDeleteId(null)
      setMenuOpenId(null)
      router.refresh()
    })
  }

  function handleEditName(objectiveId: string) {
    startTransition(async () => {
      if (!editNameValue.trim()) return
      await updateObjectiveName(objectiveId, editNameValue)
      toast({ title: t('nameUpdated'), variant: 'success' })
      setEditNameId(null)
      setMenuOpenId(null)
      router.refresh()
    })
  }

  function handleColorChange(objectiveId: string, color: string) {
    startTransition(async () => {
      await updateObjectiveColor(objectiveId, color)
      toast({ title: t('colorUpdated'), variant: 'success' })
      setColorPickerId(null)
      setMenuOpenId(null)
      router.refresh()
    })
  }

  if (objectives.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {t('emptyTitle')}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {t('emptySub')}
          </p>
        </div>
        <CreateObjectiveForm />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {objectives.map((objective) => {
          const isSelected = selectedId === objective.id
          const showMenu = menuOpenId === objective.id
          const showColorPicker = colorPickerId === objective.id
          const showConfirmDelete = confirmDeleteId === objective.id
          const showEditName = editNameId === objective.id

          return (
            <div key={objective.id} className="relative">
              <div className="flex items-center gap-1">
                <Link href={`/?objective=${objective.id}`} className="flex-1 min-w-0">
                  <div
                    className={`group relative flex items-center justify-between p-2.5 pr-4 transition-all duration-200 cursor-pointer rounded-xl border ${
                      isSelected
                        ? 'border-transparent shadow-[0_4px_15px_-5px_rgba(0,0,0,0.3)]'
                        : 'border-border/30 bg-card/20 hover:bg-secondary/20 hover:border-border/60'
                    }`}
                    style={isSelected ? { backgroundColor: `${objective.color}15`, borderColor: `${objective.color}30` } : {}}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: isSelected ? objective.color : `${objective.color}20`,
                        }}
                      >
                        <Target
                          className="h-3 w-3"
                          style={{ color: isSelected ? '#fff' : objective.color }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className={`font-semibold truncate text-[13px] ${isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground transition-colors'}`}>
                          {objective.name}
                        </h3>
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-3 w-3 shrink-0 transition-transform duration-300 ${
                        isSelected
                          ? 'translate-x-1'
                          : 'text-muted-foreground/30 group-hover:text-muted-foreground/70 group-hover:translate-x-0.5'
                      }`}
                      style={isSelected ? { color: objective.color } : {}}
                    />
                  </div>
                </Link>

                {/* Actions toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpenId(showMenu ? null : objective.id)
                    setColorPickerId(null)
                    setConfirmDeleteId(null)
                  }}
                  className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="3" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="8" cy="13" r="1.5" />
                  </svg>
                </button>
              </div>

              {/* Dropdown menu */}
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-xl border border-border bg-card shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
                  {showConfirmDelete ? (
                    <div className="p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">{t('confirmDelete')}</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleDelete(objective.id)}
                          disabled={isPending}
                          size="sm"
                          variant="destructive"
                          className="flex-1 text-xs h-7"
                        >
                          {isPending ? t('deleting') : t('deleteBtn')}
                        </Button>
                        <Button
                          onClick={() => setConfirmDeleteId(null)}
                          size="sm"
                          variant="ghost"
                          className="flex-1 text-xs h-7"
                        >
                          {t('cancelBtn')}
                        </Button>
                      </div>
                    </div>
                  ) : showColorPicker ? (
                    <div className="p-3 space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">{t('changeColor')}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => handleColorChange(objective.id, color)}
                            disabled={isPending}
                            className={`h-7 w-7 rounded-full border-2 transition-all hover:scale-110 ${
                              objective.color === color ? 'border-foreground scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        <input
                          type="color"
                          defaultValue={objective.color}
                          onChange={(e) => handleColorChange(objective.id, e.target.value)}
                          className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
                        />
                      </div>
                    </div>
                  ) : showEditName ? (
                    <div className="p-3 space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">{t('editName')}</p>
                      <input
                        type="text"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleEditName(objective.id) }}
                        className="w-full h-8 rounded-lg border border-border/60 bg-secondary/20 px-2 text-sm text-foreground outline-none focus:border-primary"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEditName(objective.id)}
                          disabled={isPending || !editNameValue.trim()}
                          size="sm"
                          className="flex-1 text-xs h-7"
                        >
                          {t('saveBtn')}
                        </Button>
                        <Button
                          onClick={() => setEditNameId(null)}
                          size="sm"
                          variant="ghost"
                          className="flex-1 text-xs h-7"
                        >
                          {t('cancelBtn')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setEditNameId(objective.id)
                          setEditNameValue(objective.name)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Pencil className="size-3.5" />
                        {t('editName')}
                      </button>
                      <button
                        onClick={() => setColorPickerId(objective.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Palette className="size-3.5" />
                        {t('changeColor')}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(objective.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                        {t('deleteObjective')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* New objective trigger card */}
        <CreateObjectiveForm />
      </div>
    </div>
  )
}
