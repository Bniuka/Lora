import { createContext, useContext, useState, useCallback } from 'react';
import VictoryModal from '../components/VictoryModal';

const VictoryContext = createContext({
  triggerVictory: () => {},
  closeVictory: () => {},
});

export function VictoryProvider({ children }) {
  const [victoryState, setVictoryState] = useState({
    isOpen: false,
    type: 'custom',
    title: '',
    subtitle: '',
    badge: '',
    reaction: '',
    btnText: '',
    duration: 3500,
    onComplete: null,
  });

  const triggerVictory = useCallback((options = {}) => {
    setVictoryState({
      isOpen: true,
      type: options.type || 'custom',
      title: options.title || '',
      subtitle: options.subtitle || '',
      badge: options.badge || '',
      reaction: options.reaction || '',
      btnText: options.btnText || '',
      duration: options.duration !== undefined ? options.duration : 3500,
      onComplete: options.onComplete || null,
    });
  }, []);

  const closeVictory = useCallback(() => {
    setVictoryState((prev) => {
      if (prev.onComplete) {
        try {
          prev.onComplete();
        } catch (e) {
          console.error('[VictoryContext] onComplete callback error:', e);
        }
      }
      return { ...prev, isOpen: false, onComplete: null };
    });
  }, []);

  return (
    <VictoryContext.Provider value={{ triggerVictory, closeVictory }}>
      {children}
      <VictoryModal
        isOpen={victoryState.isOpen}
        type={victoryState.type}
        title={victoryState.title}
        subtitle={victoryState.subtitle}
        badge={victoryState.badge}
        reaction={victoryState.reaction}
        btnText={victoryState.btnText}
        duration={victoryState.duration}
        onClose={closeVictory}
      />
    </VictoryContext.Provider>
  );
}

export function useVictory() {
  const context = useContext(VictoryContext);
  if (!context) {
    throw new Error('useVictory must be used within a VictoryProvider');
  }
  return context;
}
