import { motion } from "framer-motion";

interface AuthModeToggleProps {
  isLoginMode: boolean;
  onToggle: (isLogin: boolean) => void;
}

export const AuthModeToggle = ({ isLoginMode, onToggle }: AuthModeToggleProps) => {
  return (
    <div className="relative inline-flex items-center gap-0 p-1.5 bg-muted/40 rounded-full border-2 border-border/40 shadow-lg backdrop-blur-md overflow-hidden">
      {/* Animated background that drags smoothly */}
      <motion.div
        className="absolute inset-y-1.5 rounded-full bg-gradient-to-r from-primary via-primary/95 to-primary shadow-xl z-0"
        initial={false}
        animate={{
          x: isLoginMode ? "2%" : "98%",
        }}
        transition={{
          type: "spring",
          stiffness: 280,
          damping: 28,
          mass: 0.6,
        }}
        style={{
          width: "calc(50% - 4px)",
        }}
      />
      
      {/* Subtle glow effect */}
      <motion.div
        className="absolute inset-0 blur-2xl opacity-40 pointer-events-none"
        initial={false}
        animate={{
          x: isLoginMode ? "-10%" : "60%",
        }}
        transition={{
          type: "spring",
          stiffness: 250,
          damping: 30,
          mass: 0.7,
        }}
        style={{
          width: "60%",
          background: "radial-gradient(ellipse, hsl(var(--primary)) 0%, transparent 70%)",
        }}
      />
      
      {/* Login button */}
      <button
        type="button"
        onClick={() => onToggle(true)}
        className={`relative z-10 px-7 py-3 text-sm font-bold rounded-full transition-all duration-200 min-w-[115px]
          ${isLoginMode 
            ? "text-primary-foreground scale-[1.02]" 
            : "text-muted-foreground hover:text-foreground"
          }`}
      >
        Login
      </button>
      
      {/* Cadastro button */}
      <button
        type="button"
        onClick={() => onToggle(false)}
        className={`relative z-10 px-7 py-3 text-sm font-bold rounded-full transition-all duration-200 min-w-[115px]
          ${!isLoginMode 
            ? "text-primary-foreground scale-[1.02]" 
            : "text-muted-foreground hover:text-foreground"
          }`}
      >
        Cadastro
      </button>
    </div>
  );
};
