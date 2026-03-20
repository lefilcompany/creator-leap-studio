import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Plus, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { CategoryList } from '@/components/categorias/CategoryList';
import { CategoryDialog } from '@/components/categorias/CategoryDialog';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { CategoryWithCount, ActionCategory } from '@/types/category';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import historyBanner from '@/assets/history-banner.jpg';

export default function Categories() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { categories, isLoading, createCategory, updateCategory, deleteCategory } = useCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ActionCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryWithCount | null>(null);

  const hasTeam = !!user?.teamId;

  const handleSave = (data: { name: string; description?: string; color: string; members?: { userId: string; role: 'viewer' | 'editor' }[] }) => {
    if (editingCategory) {
      updateCategory.mutate({ id: editingCategory.id, ...data }, {
        onSuccess: () => { setDialogOpen(false); setEditingCategory(null); },
      });
    } else {
      createCategory.mutate(data, {
        onSuccess: () => { setDialogOpen(false); },
      });
    }
  };

  const handleEdit = (cat: CategoryWithCount) => {
    setEditingCategory(cat);
    setDialogOpen(true);
  };

  const handleDelete = (cat: CategoryWithCount) => {
    setDeletingCategory(cat);
  };

  const confirmDelete = () => {
    if (deletingCategory) {
      deleteCategory.mutate(deletingCategory.id);
      setDeletingCategory(null);
    }
  };

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8">
      {/* Banner */}
      <div className="relative w-full h-36 md:h-44 flex-shrink-0 overflow-hidden">
        <PageBreadcrumb variant="overlay" items={[{ label: 'Nichos' }]} />
        <img src={historyBanner} alt="" className="w-full h-full object-cover" style={{ objectPosition: 'center 30%' }} loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
      </div>

      {/* Header card */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-14 flex-shrink-0">
        <div className="bg-card rounded-2xl shadow-lg p-3 lg:p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 border border-primary/20 shadow-sm rounded-xl p-2.5 lg:p-3">
                <FolderOpen className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
                  Nichos
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <HelpCircle className="h-5 w-5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 text-sm" side="bottom" align="start">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-foreground">O que são Nichos?</h4>
                        <p className="text-muted-foreground">Nichos permitem organizar suas criações em grupos temáticos por setor de atuação. Você pode definir a visibilidade e controlar quem tem acesso.</p>
                      </div>
                    </PopoverContent>
                  </Popover>
                </h1>
                <p className="text-sm lg:text-base text-muted-foreground">Organize suas criações em nichos personalizados.</p>
              </div>
            </div>

            <Button onClick={() => { setEditingCategory(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Nicho
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="px-4 sm:px-6 lg:px-8 pt-4 pb-4 sm:pb-6 lg:pb-8">
        <CategoryList
          categories={categories}
          onSelect={(cat) => navigate(`/categories/${cat.id}`)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </main>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        onSave={handleSave}
        isSaving={createCategory.isPending || updateCategory.isPending}
        hasTeam={hasTeam}
      />

      <AlertDialog open={!!deletingCategory} onOpenChange={(o) => !o && setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nicho</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o nicho "{deletingCategory?.name}"? As ações dentro dela não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
