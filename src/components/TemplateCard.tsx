import { RuleTemplate } from '@/types/rule';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Trash2, TrendingUp } from 'lucide-react';

interface TemplateCardProps {
  template: RuleTemplate;
  onUse: (template: RuleTemplate) => void;
  onDelete: (id: string) => void;
  onPreview: (template: RuleTemplate) => void;
}

export const TemplateCard = ({ template, onUse, onDelete, onPreview }: TemplateCardProps) => {
  const categoryColors = {
    pricing: 'bg-blue-500',
    inventory: 'bg-green-500',
    shipping: 'bg-purple-500',
    validation: 'bg-orange-500',
    general: 'bg-gray-500',
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription className="mt-1">{template.description}</CardDescription>
          </div>
          <Badge className={categoryColors[template.category]}>{template.category}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{template.ruleConfig.kind}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span>{template.usageCount} uses</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={() => onUse(template)} className="flex-1">Use Template</Button>
        <Button onClick={() => onPreview(template)} variant="outline">Preview</Button>
        <Button onClick={() => onDelete(template.id)} variant="ghost" size="icon">
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
