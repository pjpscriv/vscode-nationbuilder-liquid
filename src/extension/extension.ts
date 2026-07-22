import * as vscode from 'vscode';
import { LiquidObjectCompletionProvider } from './providers/autocomplete';
import { provideHover } from './providers/hover';
import { provideDefinition } from './providers/definition';
import { LiquidUsagesCodeLensProvider } from './providers/usages';


// Called when extension loaded
export function activate(context: vscode.ExtensionContext) {
  console.log('NationBuilder Liquid: activated!');
  
  // 1. Register "Go to Definition" logic
  const definitionRegistration = vscode.languages.registerDefinitionProvider(
    { language: 'liquid' },
    { provideDefinition }
  );
  context.subscriptions.push(definitionRegistration);
  
  // 2. Register "Find Usages" logic
  const codeLensProvider = new LiquidUsagesCodeLensProvider();
  const codeLensRegistration = vscode.languages.registerCodeLensProvider(
    { language: 'liquid' }, 
    codeLensProvider
  );
  context.subscriptions.push(codeLensRegistration, codeLensProvider);

  // 3. Register "Definition on hover" logic
  const onHoverRegistration = vscode.languages.registerHoverProvider(
    { language: 'liquid' },
    { provideHover }
  );
  context.subscriptions.push(onHoverRegistration);

  // 4. Register autocomplete logic
  const autocompleteRegistration = vscode.languages.registerCompletionItemProvider(
    { language: 'liquid' },
    new LiquidObjectCompletionProvider(),
    '.'
  );
  context.subscriptions.push(autocompleteRegistration);
}


// Called when extension unloaded
export function deactivate() {}
