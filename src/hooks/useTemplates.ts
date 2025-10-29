import { useState, useEffect } from 'react';
import { RuleTemplate, Rule } from '@/types/rule';

export const useTemplates = () => {
  const [templates, setTemplates] = useState<RuleTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    const stored = localStorage.getItem('rule-templates');
    if (stored) {
      setTemplates(JSON.parse(stored));
    }
    setLoading(false);
  };

  const saveTemplates = (newTemplates: RuleTemplate[]) => {
    localStorage.setItem('rule-templates', JSON.stringify(newTemplates));
    setTemplates(newTemplates);
  };

  const createTemplate = (template: Omit<RuleTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
    const newTemplate: RuleTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveTemplates([...templates, newTemplate]);
    return newTemplate;
  };

  const updateTemplate = (id: string, updates: Partial<RuleTemplate>) => {
    const updated = templates.map(t => 
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    );
    saveTemplates(updated);
  };

  const deleteTemplate = (id: string) => {
    saveTemplates(templates.filter(t => t.id !== id));
  };

  const incrementUsage = (id: string) => {
    updateTemplate(id, { usageCount: (templates.find(t => t.id === id)?.usageCount || 0) + 1 });
  };

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    incrementUsage,
  };
};
