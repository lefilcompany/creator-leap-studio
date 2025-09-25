import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, Plus, Search, Edit, Trash2, Calendar } from "lucide-react";

const Brands = () => {
  const [selectedBrand, setSelectedBrand] = useState("acucar-petribu");

  const brands = [
    {
      id: "acucar-petribu",
      name: "Açúcar Petribu",
      responsible: "copy@lefil.com.br",
      createdAt: "02/09/2025",
      segment: "Alimentício / Confeitaria / Doméstico / Açúcares",
      values: "Sabor, Tradição, Memória, Afeto, Família, Doçura, Regionalidade, Conexão.",
      keywords: "Sabor, Tradição, Afeto, Família, Açúcar, Saudável.",
      goals: "Fortalecer a conexão emocional com os consumidores, Valorizar a tradição e o sabor regional, Inspirar o uso do açúcar em receitas afetivas, Reforçar a presença da marca no dia a dia das famílias, Engajar com",
      avatar: "A"
    },
    {
      id: "ceramica-brennand", 
      name: "Cerâmica Brennand",
      responsible: "julia.lima@lefil.com.br",
      createdAt: "18/09/2025",
      avatar: "C"
    },
    {
      id: "escola-marketing",
      name: "Escola de Marketing do Futuro", 
      responsible: "thalles.silva.ext@lefil.com.br",
      createdAt: "03/09/2025",
      avatar: "E"
    },
    {
      id: "grupo-cornelio",
      name: "Grupo Cornélio Brennand",
      responsible: "copy@lefil.com.br", 
      createdAt: "02/09/2025",
      avatar: "G"
    },
    {
      id: "iclub",
      name: "Iclub",
      responsible: "marianna.monteiro.ext@lefil.com.br",
      createdAt: "08/09/2025", 
      avatar: "I"
    },
    {
      id: "juq",
      name: "JUQ",
      responsible: "copy@lefil.com.br",
      createdAt: "11/09/2025",
      avatar: "J"
    }
  ];

  const selectedBrandData = brands.find(b => b.id === selectedBrand) || brands[0];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 bg-pink-50 px-4 py-3 rounded-lg">
          <Tag className="w-5 h-5 text-pink-600" />
          <div>
            <h1 className="text-xl font-semibold">Suas Marcas</h1>
            <p className="text-sm text-muted-foreground">Gerencie, edite ou crie novas marcas para seus projetos.</p>
          </div>
        </div>
        
        <Button className="creator-button-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nova marca
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Brands List */}
        <Card className="lg:col-span-2 creator-card">
          <CardHeader>
            <CardTitle>Todas as marcas</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar marcas..." className="pl-10" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {brands.map((brand) => (
              <div 
                key={brand.id}
                onClick={() => setSelectedBrand(brand.id)}
                className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedBrand === brand.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-semibold">
                    {brand.avatar}
                  </div>
                  <div>
                    <h3 className="font-medium">{brand.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Responsável: {brand.responsible}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Criado em: {brand.createdAt}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Brand Details */}
        <Card className="creator-card">
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg">
                {selectedBrandData.avatar}
              </div>
              <div>
                <CardTitle className="text-lg">{selectedBrandData.name}</CardTitle>
                <CardDescription>
                  Responsável: {selectedBrandData.responsible}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedBrandData.segment && (
              <div>
                <h4 className="font-medium text-sm mb-2">Segmento</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedBrandData.segment}
                </p>
              </div>
            )}

            {selectedBrandData.values && (
              <div>
                <h4 className="font-medium text-sm mb-2">Valores</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedBrandData.values}
                </p>
              </div>
            )}

            {selectedBrandData.keywords && (
              <div>
                <h4 className="font-medium text-sm mb-2">Palavras-Chave</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedBrandData.keywords}
                </p>
              </div>
            )}

            {selectedBrandData.goals && (
              <div>
                <h4 className="font-medium text-sm mb-2">Metas do Negócio</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedBrandData.goals}
                </p>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full mb-2">
                <Trash2 className="w-4 h-4 mr-2" />
                Deletar
              </Button>
              <Button className="w-full creator-button-primary">
                <Edit className="w-4 h-4 mr-2" />
                Editar marca
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Brands;