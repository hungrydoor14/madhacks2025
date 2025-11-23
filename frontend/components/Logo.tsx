import { Play, RefreshCw } from 'lucide-react';

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-4xl md:text-5xl font-serif font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
        Repla
      </span>
      <div className="relative">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg" style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))' }}>
          <Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-white" />
        </div>
        <RefreshCw className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 text-cyan-500 animate-spin-slow" style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))' }} />
      </div>
      <span className="text-4xl md:text-5xl font-serif font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
        e
      </span>
    </div>
  );
}

