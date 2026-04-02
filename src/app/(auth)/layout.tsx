import { Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Decorative left panel - hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 bg-primary relative overflow-hidden flex-col items-center justify-center p-12 text-primary-foreground">
        {/* Abstract gradient decorations */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-[-10%] right-[-15%] w-[50%] h-[50%] rounded-full bg-white/15 blur-3xl" />
          <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="relative z-10 max-w-md text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            PRODO
          </h1>
          <div className="pt-2">
            <p className="text-lg text-primary-foreground/90 font-medium leading-relaxed">
              Focus & Build.
            </p>
            <p className="text-sm text-primary-foreground/70 leading-relaxed mt-1">
              Simplifica tu flujo de trabajo, elimina distracciones y alcanza tus objetivos con extrema precisión.
            </p>
          </div>
          <div className="flex items-center justify-center gap-8 pt-4 text-sm text-primary-foreground/70">
            <div className="text-center">
              <div className="text-2xl font-semibold text-primary-foreground/90">25min</div>
              <div>Bloques de enfoque</div>
            </div>
            <div className="w-px h-10 bg-primary-foreground/20" />
            <div className="text-center">
              <div className="text-2xl font-semibold text-primary-foreground/90">0</div>
              <div>Distracciones</div>
            </div>
            <div className="w-px h-10 bg-primary-foreground/20" />
            <div className="text-center">
              <div className="text-2xl font-semibold text-primary-foreground/90">100%</div>
              <div>Progreso</div>
            </div>
          </div>
        </div>
      </div>

      {/* Form area */}
      <div className="flex-1 flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
