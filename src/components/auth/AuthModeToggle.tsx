import { motion } from "framer-motion";

interface AuthModeToggleProps {
  isLoginMode: boolean;
  onToggle: (isLogin: boolean) => void;
}

export const AuthModeToggle = ({ isLoginMode, onToggle }: AuthModeToggleProps) => {
  return (
    <div className="relative inline-flex items-center gap-0 p-1 bg-muted/50 rounded-full border border-border/50 shadow-sm backdrop-blur-sm">
      {/* Animated background pill */}
      <motion.div
        className="absolute h-[calc(100%-8px)] rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg"
        initial={false}
        animate={{
          left: isLoginMode ? 4 : "50%",
          right: isLoginMode ? "50%" : 4,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
        }}
      />
      
      {/* Login button */}
      <button
        type="button"
        onClick={() => onToggle(true)}
        className={`relative z-10 px-6 py-2.5 text-sm font-semibold rounded-full transition-colors duration-200 min-w-[100px]
          ${isLoginMode 
            ? "text-primary-foreground" 
            : "text-muted-foreground hover:text-foreground"
          }`}
      >
        Login
      </button>
      
      {/* Cadastro button */}
      <button
        type="button"
        onClick={() => onToggle(false)}
        className={`relative z-10 px-6 py-2.5 text-sm font-semibold rounded-full transition-colors duration-200 min-w-[100px]
          ${!isLoginMode 
            ? "text-primary-foreground" 
            : "text-muted-foreground hover:text-foreground"
          }`}
      >
        Cadastro
      </button>
    </div>
  );
};
