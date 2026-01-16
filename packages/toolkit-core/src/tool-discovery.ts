import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { ToolContract } from '@ai-toolkit/tool-contract';

/**
 * Tool Discovery - Automatické načítání tools z packages
 */

export interface ToolDiscoveryOptions {
  /**
   * Cesty k adresářům s tools
   */
  toolPaths?: string[];
  
  /**
   * Pattern pro hledání tool souborů
   */
  pattern?: string;
  
  /**
   * Zda validovat tools při načítání
   */
  validateOnLoad?: boolean;
}

/**
 * Tool Discovery Engine
 */
export class ToolDiscovery {
  private tools: Map<string, ToolContract> = new Map();
  private errors: Array<{ path: string; error: string }> = [];

  constructor(private options: ToolDiscoveryOptions = {}) {}

  /**
   * Načte všechny tools z packages
   */
  async discoverTools(basePath: string = process.cwd()): Promise<{
    tools: ToolContract[];
    errors: Array<{ path: string; error: string }>;
  }> {
    this.tools.clear();
    this.errors = [];

    const toolPaths = this.options.toolPaths || [
      join(basePath, 'packages', 'toolkit-tools', 'src', 'tools'),
    ];

    for (const toolPath of toolPaths) {
      try {
        const files = this.findToolFiles(toolPath);
        for (const file of files) {
          await this.loadToolFromFile(file);
        }
      } catch (error) {
        this.errors.push({
          path: toolPath,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      tools: Array.from(this.tools.values()),
      errors: this.errors,
    };
  }

  /**
   * Najde všechny tool soubory v adresáři
   */
  private findToolFiles(dirPath: string): string[] {
    const files: string[] = [];
    
    try {
      const entries = readdirSync(dirPath);
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Rekurzivní prohledávání
          files.push(...this.findToolFiles(fullPath));
        } else if (stat.isFile() && extname(entry) === '.ts' && !entry.includes('.test.') && !entry.includes('.spec.')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Adresář neexistuje nebo není přístupný
    }
    
    return files;
  }

  /**
   * Načte tool z TypeScript souboru
   */
  private async loadToolFromFile(filePath: string): Promise<void> {
    try {
      // Pro teď jednoduchá implementace - v produkci by se použil TypeScript compiler API
      // nebo dynamic import
      const content = readFileSync(filePath, 'utf-8');
      
      // Hledáme export funkce create*Tools
      const createFunctionMatch = content.match(/export\s+function\s+create(\w+)Tools/);
      if (!createFunctionMatch) {
        // Není to tool soubor
        return;
      }

      // V produkci by se zde použil TypeScript compiler API pro extrakci tool kontraktů
      // Pro teď jen logujeme, že soubor byl nalezen
      console.log(`Found tool file: ${filePath}`);
      
      // TODO: Implementovat skutečné načítání pomocí TypeScript compiler API
      // nebo dynamic import s eval (ne ideální, ale funkční)
      
    } catch (error) {
      this.errors.push({
        path: filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Registruje tool manuálně
   */
  registerTool(tool: ToolContract): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool with id "${tool.id}" is already registered`);
    }
    this.tools.set(tool.id, tool);
  }

  /**
   * Vrací všechny nalezené tools
   */
  getTools(): ToolContract[] {
    return Array.from(this.tools.values());
  }

  /**
   * Vrací tool podle ID
   */
  getTool(toolId: string): ToolContract | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Vrací chyby při načítání
   */
  getErrors(): Array<{ path: string; error: string }> {
    return [...this.errors];
  }
}

/**
 * Helper pro načtení tools z package
 */
export async function discoverToolsFromPackage(
  packagePath: string
): Promise<ToolContract[]> {
  const discovery = new ToolDiscovery({
    toolPaths: [join(packagePath, 'src', 'tools')],
    validateOnLoad: true,
  });

  const result = await discovery.discoverTools(packagePath);
  
  if (result.errors.length > 0) {
    console.warn('Errors during tool discovery:', result.errors);
  }

  return result.tools;
}
