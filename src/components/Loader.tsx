import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope } from "lucide-react";

export default function Loader() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] grid place-items-center bg-background"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 8, -8, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="w-16 h-16 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow"
          >
            <Stethoscope className="w-8 h-8 text-primary-foreground" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
