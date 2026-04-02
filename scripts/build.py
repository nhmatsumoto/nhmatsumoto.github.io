from __future__ import annotations
import shutil
from pathlib import Path
from blog_engine import build_site, ROOT


def main() -> None:
    output_dir = ROOT / "_site"
    
    # 1. Limpar e preparar diretório de saída
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 2. Copiar assets estáticos
    static_dirs = ["assets", "docs"] # Adicione outros se necessário
    for d in static_dirs:
        src = ROOT / d
        if src.exists():
            shutil.copytree(src, output_dir / d)
            
    # 3. Gerar arquivos dinâmicos dentro de _site
    result = build_site(output_dir=output_dir)
    
    # 4. Adicionar .nojekyll para o GitHub Pages
    (output_dir / ".nojekyll").touch()
    
    print(
        f"Build concluído em {output_dir.name}: "
        f"{result['published_posts']} post(s), "
        f"{result['published_projects']} projeto(s), "
        f"{result['published_documents']} documento(s)."
    )
    for path in result["generated_files"]:
        print(f"- {path}")


if __name__ == "__main__":
    main()
