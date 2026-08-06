# Almanacco GSG — backup dati

Backup mensile automatico dei dati del database di [Almanacco GSG](https://almanacco-gsg-psi.vercel.app/) ([codice sorgente](https://github.com/ritchiebello-rgb/almanacco-gsg)).

## Cosa fa

Ogni primo del mese, una GitHub Action ([`.github/workflows/backup.yml`](.github/workflows/backup.yml)) legge tutte le tabelle del database Supabase e salva un file JSON per tabella dentro [`data/`](data/), poi fa un commit automatico. Ogni backup passato resta quindi consultabile nella cronologia commit di questo repository, anche se `data/` mostra sempre solo l'ultimo.

Non serve nessuna azione manuale perché funzioni: gira da sola.

## Perché esiste un repository a parte

Per isolarlo dal codice del sito: un problema nel repository principale (o in Supabase stesso) non deve poter compromettere anche i backup. Vedi `docs/GUIDA_EMERGENZA.md` nel repository principale per il quadro completo di cosa fare in caso di perdita di accesso.

## Come lanciarlo manualmente

Tab **Actions** di questo repository → workflow "Backup mensile database" → **Run workflow**. Utile per un primo test o per un backup fuori programma prima di un intervento rischioso sul database.

## Come si ripristina un backup

I file in `data/*.json` sono un export riga-per-riga di ogni tabella (`SELECT * FROM tabella`, senza filtri). Per reinserirli in un database vuoto (stesso schema — vedi `docs/GUIDA_EMERGENZA.md` nel repo principale per ricrearlo):

1. Ricrea prima le tabelle "senza dipendenze" (`stagioni`, `squadre`, `allenatori`, `calciatori`, `tag`), poi quelle che le referenziano (`tornei`, `squadre_allenatori`, ...) — l'ordine conta per via delle chiavi esterne.
2. Per ogni file, un inserimento in blocco è più semplice via script (Node + `@supabase/supabase-js`, `supabase.from(tabella).insert(righeJson)` a lotti) che a mano: gli id sono UUID già assegnati, quindi le relazioni tra tabelle restano intatte automaticamente.

Non è un ripristino a un click: è un dato grezzo pronto per essere reinserito, pensato per uno scenario di vera emergenza, non per un rollback quotidiano.

## Configurazione richiesta (una tantum)

Due secret in **Settings → Secrets and variables → Actions** di questo repository, con **gli stessi valori già presenti nelle variabili d'ambiente del progetto Vercel del sito principale**:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

È la stessa chiave pubblica di sola lettura già visibile nel browser di chiunque visiti il sito — non è una credenziale nuova o più sensibile di quella già in uso.
