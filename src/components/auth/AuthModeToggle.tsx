import { motion } from "framer-motion";

interface AuthModeToggleProps {
  isLoginMode: boolean;
  onToggle: (isLogin: boolean) => void;
}

export const AuthModeToggle = ({ isLoginMode, onToggle }: AuthModeToggleProps) => {
  return (
    <div className="relative inline-flex items-center gap-0 p-1.5 bg-muted/40 rounded-full border-2 border-border/40 shadow-lg backdrop-blur-md overflow-hidden">
      {/* Animated background with smooth spring physics */}
      <motion.div
        className="absolute inset-y-1.5 rounded-full bg-gradient-to-r from-primary via-primary/95 to-primary z-0"
        initial={false}
        animate={{
          x: isLoginMode ? "2%" : "98%",
          scale: isLoginMode ? 1 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 35,
          mass: 0.5,
        }}
        style={{
          width: "calc(50% - 4px)",
          boxShadow: "0 4px 20px -2px hsl(var(--primary) / 0.4), 0 0 0 1px hsl(var(--primary) / 0.1)",
        }}
      />
      
      {/* Enhanced glow effect with smoother motion */}
      <motion.div
        className="absolute inset-0 blur-3xl opacity-30 pointer-events-none"
        initial={false}
        animate={{
          x: isLoginMode ? "-15%" : "65%",
          scale: [1, 1.1, 1],
        }}
        transition={{
          x: {
            type: "spring",
            stiffness: 350,
            damping: 40,
            mass: 0.6,
          },
          scale: {
            duration: 0.6,
            ease: "easeInOut",
          }
        }}
        style={{
          width: "60%",
          background: "radial-gradient(ellipse, hsl(var(--primary)) 0%, transparent 70%)",
        }}
      />
      
      {/* Login button with scale animation */}
      <motion.button
        type="button"
        onClick={() => onToggle(true)}
        whileTap={{ scale: 0.97 }}
        className={`relative z-10 px-12 py-3 text-sm font-bold rounded-full min-w-[140px]
          ${isLoginMode 
            ? "text-primary-foreground" 
            : "text-muted-foreground"
          }`}
      >
        <motion.span
          animate={{
            scale: isLoginMode ? 1.05 : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
          className="inline-block"
        >
          Login
        </motion.span>
      </motion.button>
      
      {/* Cadastro button with scale animation */}
      <motion.button
        type="button"
        onClick={() => onToggle(false)}
        whileTap={{ scale: 0.97 }}
        className={`relative z-10 px-12 py-3 text-sm font-bold rounded-full min-w-[140px]
          ${!isLoginMode 
            ? "text-primary-foreground" 
            : "text-muted-foreground"
          }`}
      >
        <motion.span
          animate={{
            scale: !isLoginMode ? 1.05 : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
          className="inline-block"
        >
          Cadastro
        </motion.span>
      </motion.button>
    </div>
  );
};
