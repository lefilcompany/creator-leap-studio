import { motion } from "framer-motion";

interface AuthModeToggleProps {
  isLoginMode: boolean;
  onToggle: (isLogin: boolean) => void;
}

export const AuthModeToggle = ({ isLoginMode, onToggle }: AuthModeToggleProps) => {
  return (
    <div className="relative inline-flex items-center gap-0 p-1.5 bg-muted/30 rounded-full border-2 border-border/50 shadow-lg backdrop-blur-sm overflow-hidden">
      {/* Animated background that drags */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/80 rounded-full shadow-xl"
        initial={false}
        animate={{
          x: isLoginMode ? "0%" : "50%",
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.8,
        }}
        style={{
          width: "50%",
        }}
      />
      
      {/* Glow effect that follows */}
      <motion.div
        className="absolute inset-0 blur-xl opacity-50"
        initial={false}
        animate={{
          x: isLoginMode ? "0%" : "50%",
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.8,
        }}
        style={{
          width: "50%",
          background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
        }}
      />
      
      {/* Login button */}
      <button
        type="button"
        onClick={() => onToggle(true)}
        className={`relative z-10 px-6 py-3 text-sm font-bold rounded-full transition-all duration-300 min-w-[110px]
          ${isLoginMode 
            ? "text-primary-foreground scale-105" 
            : "text-muted-foreground hover:text-foreground hover:scale-105"
          }`}
      >
        Login
      </button>
      
      {/* Cadastro button */}
      <button
        type="button"
        onClick={() => onToggle(false)}
        className={`relative z-10 px-6 py-3 text-sm font-bold rounded-full transition-all duration-300 min-w-[110px]
          ${!isLoginMode 
            ? "text-primary-foreground scale-105" 
            : "text-muted-foreground hover:text-foreground hover:scale-105"
          }`}
      >
        Cadastro
      </button>
    </div>
  );
};
