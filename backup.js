// Backup mensile dei dati di Almanacco GSG.
//
// Legge ogni tabella del database Supabase con la stessa chiave pubblica di
// sola lettura già usata dal sito (nessuna credenziale nuova o sensibile) e
// scrive un file JSON per tabella in data/. Le VISTE (statistiche_calciatore_torneo,
// statistiche_squadra_torneo, statistiche_allenatore_torneo) sono escluse di
// proposito: sono ricalcolabili dalle tabelle vere e, nel caso della prima,
// la sua colonna "gol" è nota per essere inaffidabile — non va conservata
// come se fosse un dato originale.
//
// IMPORTANTE: se in futuro viene aggiunta una nuova tabella al sito
// principale (repo almanacco-gsg), aggiungila anche all'elenco TABELLE qui
// sotto, altrimenti il backup non la includerà.

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const TABELLE = [
  "stagioni",
  "squadre",
  "allenatori",
  "squadre_allenatori",
  "calciatori",
  "tornei",
  "partite",
  "statistiche_partite",
  "rose",
  "classifiche",
  "tag",
  "editoriali",
  "editoriale_tag",
  "editoriale_immagini",
  "storia_campionati",
  "storia_campionati_immagini",
];

const PAGE_SIZE = 1000;

// Supabase/PostgREST tronca silenziosamente le risposte oltre le 1000 righe:
// va sempre paginato esplicitamente (stesso principio di fetchAllRows in
// src/lib/supabase.ts nel repo del sito).
async function fetchAll(tabella) {
  let righe = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(tabella)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Errore leggendo "${tabella}": ${error.message}`);
    }
    righe = righe.concat(data ?? []);
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return righe;
}

async function main() {
  const outDir = path.join(__dirname, "data");
  fs.mkdirSync(outDir, { recursive: true });

  const riepilogo = {};
  const saltate = [];
  for (const tabella of TABELLE) {
    process.stdout.write(`Esporto ${tabella}... `);
    try {
      const righe = await fetchAll(tabella);
      fs.writeFileSync(
        path.join(outDir, `${tabella}.json`),
        JSON.stringify(righe, null, 1)
      );
      riepilogo[tabella] = righe.length;
      console.log(`${righe.length} righe`);
    } catch (err) {
      // Non blocca l'intero backup per una tabella sola: es. subito dopo
      // aver aggiunto una tabella al codice del sito ma prima di aver
      // eseguito lo script SQL corrispondente su Supabase. Viene comunque
      // segnalata chiaramente nel riepilogo per non passare inosservata.
      console.log(`SALTATA (${err.message})`);
      saltate.push({ tabella, errore: err.message });
    }
  }

  fs.writeFileSync(
    path.join(outDir, "_riepilogo.json"),
    JSON.stringify(
      {
        data_backup: new Date().toISOString(),
        conteggi_righe: riepilogo,
        tabelle_saltate: saltate,
      },
      null,
      1
    )
  );

  if (saltate.length > 0) {
    console.log(
      `\nATTENZIONE: ${saltate.length} tabella/e saltata/e (vedi _riepilogo.json). Il backup delle altre tabelle è comunque completo.`
    );
  }
  console.log("Backup completato.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
