declare module 'sanity' {
  export interface DefineConfigOptions {
    name?: string;
    title?: string;
    projectId: string;
    dataset: string;
    plugins?: any[];
    schema?: {
      types: any[];
    };
    structure?: (S: any) => any;
  }
  
  export function defineConfig(config: DefineConfigOptions): any;
}

declare module 'sanity/structure' {
  export interface StructureBuilder {
    listItem(title: string): any;
    documentTypeListItem(schemaType: string): any;
    defaultDocumentNode: any;
  }
}

declare module '@sanity/vision' {
  export function vision(): any;
}

declare module '@sanity/color-input' {
  export function colorInput(): any;
}

declare module 'next-sanity' {
  export function createClient(config: any): any;
  export function groq(strings: TemplateStringsArray, ...values: any[]): string;
}