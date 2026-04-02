'use client'

import Link from 'next/link'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { BarChart3, Home, Sparkles, CheckSquare2, ArrowLeftRight, LogOut } from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border/50 bg-background/80 px-4 py-6 text-foreground backdrop-blur-md transition-all duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Sparkles className="size-4" />
              </div>
              {!collapsed && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    PRODO
                  </p>
                  <p className="text-sm font-semibold text-foreground">Workspace</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="rounded-md border border-transparent p-1.5 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
              title={collapsed ? 'Expandir barra' : 'Contraer barra'}
            >
              <ArrowLeftRight className="size-3.5" />
            </button>
          </div>

          <nav className="space-y-2">
            <Link
              href="/"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                collapsed ? 'justify-center mx-1 py-3' : 'text-foreground hover:bg-muted'
              }`}
            >
              <Home className="size-4 text-muted-foreground" />
              {!collapsed && 'Enfoque'}
            </Link>
            <Link
              href="/dashboard"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                collapsed ? 'justify-center mx-1 py-3' : 'text-foreground hover:bg-muted'
              }`}
            >
              <BarChart3 className="size-4 text-muted-foreground" />
              {!collapsed && 'Análisis'}
            </Link>
          </nav>
        </div>

        <div className="space-y-4">
          {!collapsed && (
            <div className="rounded-xl border border-border/50 bg-secondary/30 p-3 text-[13px] text-muted-foreground">
              <p className="font-semibold text-foreground mb-2">Atajos</p>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-2">
                  <span className="inline-flex size-5 items-center justify-center rounded bg-primary/10 text-primary">
                    <CheckSquare2 className="size-3" />
                  </span>
                  Crear tarea
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex size-5 items-center justify-center rounded bg-primary/10 text-primary">
                    <Sparkles className="size-3" />
                  </span>
                  <kbd className="rounded bg-background px-1.5 py-0.5 text-[10px] font-mono font-medium text-foreground border border-border/50">Space</kbd> distr.
                </li>
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive ${
              collapsed ? 'justify-center py-3' : ''
            }`}
          >
            <LogOut className="size-4" />
            {!collapsed && 'Cerrar sesión'}
          </button>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Cerrar sesión</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Seguro que quieres salir de PRODO? Tu sesión actual se mantendrá disponible en el registro.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:bg-foreground/90"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
