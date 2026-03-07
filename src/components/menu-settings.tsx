'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Settings, Layout, Menu } from 'lucide-react';
import { useMenuSettings, MenuPosition, MenuBehavior } from '@/hooks/use-menu-settings';

interface MenuSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MenuSettings({ isOpen, onClose }: MenuSettingsProps) {
  const { settings, updatePosition, updateBehavior } = useMenuSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Menu
          </CardTitle>
          <CardDescription>
            Personalize como o menu de navegação deve aparecer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Posição do Menu */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Posição do Menu
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={settings.position === 'top' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updatePosition('top')}
                className="flex items-center gap-2"
              >
                <div className="w-4 h-4 border-t-2 border-current" />
                Topo
              </Button>
              <Button
                variant={settings.position === 'side' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updatePosition('side')}
                className="flex items-center gap-2"
              >
                <div className="w-4 h-4 border-l-2 border-current" />
                Lateral
              </Button>
            </div>
          </div>

          {/* Comportamento do Menu */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Menu className="h-4 w-4" />
              Comportamento do Menu
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={settings.behavior === 'fixed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateBehavior('fixed')}
                className="flex items-center gap-2"
              >
                <div className="w-4 h-4 bg-current" />
                Fixo
              </Button>
              <Button
                variant={settings.behavior === 'collapsible' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateBehavior('collapsible')}
                className="flex items-center gap-2"
              >
                <div className="w-4 h-4 border-2 border-current" />
                Suspenso
              </Button>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2 pt-4">
            <Button onClick={onClose} className="flex-1">
              Salvar e Fechar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
