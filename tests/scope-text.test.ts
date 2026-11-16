import { describe, expect, it } from "vitest";
import { extractClause1ScopeOnly } from "../src/lib/scope-text";
import { buildMachinePackFromText } from "../src/lib/standard-import";
import { tocFromFullText } from "../src/lib/preview-raster";

const english = `
1
Scope

This African standard specifies the requirements and methods of sampling and test for fresh mackerel.

2
Normative references

AOAC 972.23, Lead in fish
ARS 56, Prepackaged foods — Labelling
`;

const french = `
NORME AFRICAINE
ARS 1184: 2025

Maquereau frais, congelé et en conserve — Spécifications

Table des matières

1
Champ d'application ............................................................................................ 4
2
Références normatives ....................................................................................... 4
3
Termes et définitions ........................................................................................... 5
8
Échantillonnage................................................................................................... 9

1
Champ d'application

La présente norme africaine spécifie les exigences et les méthodes d'échantillonnage et d'essai
applicables au maquereau frais, congelé et en conserve destiné à la consommation humaine.

2
Références normatives

Les documents référencés suivants sont indispensables à l'application du présent document.
ARS 56, Aliments préemballés — Étiquetage

3
Termes et définitions

maquereau
nom commun appliqué à plusieurs espèces de poissons pélagiques

7
Emballage et étiquetage

7.1
Emballage

Le produit est emballé dans un récipient adapté convenu entre l'acheteur et le fournisseur.

7.2
Étiquetage

Le nom du produit doit figurer sur l'étiquette de chaque emballage.

8
Échantillonnage

L'échantillonnage est réalisé selon les directives générales CXG 50.
`;

const portuguese = `
1
Campo de aplicação

A presente Norma Africana especifica os requisitos para o produto destinado ao consumo humano.

2
Referências normativas

ISO 4833, Microbiologia dos alimentos
`;

const portugueseAmbito = `
NORMA AFRICANA
ARS 1184: 2025

Cavala fresca, congelada e enlatada — Especificação

Índice

1
Âmbito ................................................................................ 4
2
Referências normativas ..................................................... 4
3
Termos e definições .......................................................... 5
8
Amostragem ..................................................................... 9

1
Âmbito

A presente Norma Africana especifica os requisitos e os métodos de amostragem e de ensaio
aplicáveis à cavala fresca, congelada e enlatada destinada ao consumo humano.

2
Referências normativas

Os documentos referenciados seguintes são indispensáveis.
ARS 56, Alimentos pré-embalados — Rotulagem

3
Termos e definições

cavala
nome comum aplicado a várias espécies

7
Embalagem e rotulagem

7.1
Embalagem

O produto é embalado num recipiente adequado acordado entre o comprador e o fornecedor.

7.2
Rotulagem

O nome do produto deve figurar no rótulo.

8
Amostragem

A amostragem é realizada segundo a CXG 50.
`;

const arabic = `
مواصفة أفريقية
ARS 1184: 2025

الماكريل الطازج والمجمد والمعلب — مواصفات

المحتويات

1
المجال ................................................................................ 4
2
المراجع المعيارية ............................................................... 4

1
المجال

تحدد هذه المواصفة الأفريقية متطلبات المنتج الموجه للاستهلاك البشري وطرق أخذ العينات والاختبار.

2
المراجع المعيارية

الوثائق المرجعية التالية لا غنى عنها لتطبيق هذه الوثيقة.
ARS 56

3
المصطلحات والتعاريف

الماكريل
اسم شائع يطلق على عدة أنواع

7
التعبئة والوسم

7.1
التعبئة

يعبأ المنتج في وعاء مناسب يتفق عليه المشتري والمورد.

7.2
الوسم

يجب أن يظهر اسم المنتج على بطاقة كل عبوة.

8
أخذ العينات

يؤخذ العينات وفق التوجيهات العامة CXG 50.
`;

function visualArabic(text: string) {
  return text
    .split("\n")
    .map((line) => {
      const letters = [...line].filter((ch) => /\p{L}/u.test(ch));
      if (!letters.length) return line;
      const arabicLetters = letters.filter((ch) => /[\u0600-\u06FF]/u.test(ch)).length;
      if (arabicLetters / letters.length < 0.6) return line;
      return [...line].reverse().join("");
    })
    .join("\n");
}

describe("clause 1 scope cutoff", () => {
  it("keeps an English scope sentence that has no following clause", () => {
    expect(extractClause1ScopeOnly("This African Standard specifies requirements for milled rice.")).toBe(
      "This African Standard specifies requirements for milled rice.",
    );
  });

  it("stops an English standard at normative references", () => {
    const scope = extractClause1ScopeOnly(english);
    expect(scope).toMatch(/specifies the requirements/i);
    expect(scope).not.toMatch(/AOAC|Normative references/);
  });

  it("stops a French standard at références normatives, ignoring the contents list", () => {
    const scope = extractClause1ScopeOnly(french);
    expect(scope).toMatch(/spécifie les exigences/);
    expect(scope).not.toMatch(/ARS 56|Références normatives/);
    expect(scope).not.toMatch(/\.{4}/);
  });

  it("stops a Portuguese standard at referências normativas", () => {
    const scope = extractClause1ScopeOnly(portuguese);
    expect(scope).toMatch(/especifica os requisitos/);
    expect(scope).not.toMatch(/ISO 4833|Referências normativas/);
  });

  it("stops an older Portuguese objectivo heading at referências normativas", () => {
    const scope = extractClause1ScopeOnly(`
1
Objectivo e campo de aplicação

A presente Norma Africana especifica os requisitos para a cavala destinada ao consumo humano.

2
Referências normativas

ISO 4833
`);
    expect(scope).toMatch(/Objectivo e campo de aplicação/);
    expect(scope).toMatch(/especifica os requisitos/);
    expect(scope).not.toMatch(/ISO 4833/);
  });

  it("stops a Portuguese Âmbito edition at referências normativas, ignoring the índice", () => {
    const scope = extractClause1ScopeOnly(portugueseAmbito);
    expect(scope).toMatch(/Âmbito/);
    expect(scope).toMatch(/especifica os requisitos/);
    expect(scope).not.toMatch(/ARS 56|Referências normativas/);
    expect(scope).not.toMatch(/\.{4}/);
  });

  it("stops an Arabic standard at المراجع المعيارية", () => {
    const scope = extractClause1ScopeOnly(arabic);
    expect(scope).toMatch(/تحدد هذه المواصفة/);
    expect(scope).not.toMatch(/ARS 56|المراجع المعيارية/);
  });

  it("stops an Arabic standard when the PDF text is in visual order", () => {
    const scope = extractClause1ScopeOnly(visualArabic(arabic));
    expect(scope).toMatch(/تحدد هذه المواصفة/);
    expect(scope).not.toMatch(/ARS 56|المراجع المعيارية/);
  });
});

describe("contents list", () => {
  it("reads French clause titles, including accented words", () => {
    const toc = tocFromFullText(french);
    expect(toc.find((entry) => entry.number === "1")?.title).toMatch(/Champ d'application/);
    expect(toc.find((entry) => entry.number === "8")?.title).toMatch(/Échantillonnage/);
    expect(toc.find((entry) => entry.number === "1")?.includedInPreview).toBe(true);
    expect(toc.find((entry) => entry.number === "2")?.includedInPreview).toBe(false);
  });

  it("reads Portuguese clause titles", () => {
    const toc = tocFromFullText(portugueseAmbito);
    expect(toc.find((entry) => entry.number === "1")?.title).toMatch(/Âmbito/);
    expect(toc.find((entry) => entry.number === "8")?.title).toMatch(/Amostragem/);
    expect(toc.find((entry) => entry.number === "2")?.includedInPreview).toBe(false);
  });
});

describe("machine pack from a French source", () => {
  it("extracts the same sections an English upload would", () => {
    const { pack } = buildMachinePackFromText({
      fullText: french,
      fileName: "ARS-1184-fr.pdf",
      extractionMethod: "test",
    });
    expect(pack.scope.text.en).toMatch(/spécifie les exigences/);
    expect(pack.scope.text.en).not.toMatch(/ARS 56/);
    expect(pack.normativeReferences.some((ref) => /ARS 56/i.test(ref.raw))).toBe(true);
    expect(pack.packaging?.text).toMatch(/emballé/i);
    expect(pack.labelling?.text).toMatch(/étiquette/i);
    expect(pack.sampling?.text).toMatch(/CXG 50/);
    expect(pack.definitions?.text).toMatch(/maquereau/i);
    expect(pack.standard.title.en).toMatch(/Spécifications/);
  });
});

describe("machine pack from Portuguese and Arabic sources", () => {
  it("extracts the same sections from a Portuguese Âmbito edition", () => {
    const { pack } = buildMachinePackFromText({
      fullText: portugueseAmbito,
      fileName: "ARS-1184-pt.pdf",
      extractionMethod: "test",
    });
    expect(pack.scope.text.en).toMatch(/especifica os requisitos/);
    expect(pack.scope.text.en).not.toMatch(/ARS 56/);
    expect(pack.normativeReferences.some((ref) => /ARS 56/i.test(ref.raw))).toBe(true);
    expect(pack.packaging?.text).toMatch(/embalado/i);
    expect(pack.labelling?.text).toMatch(/rótulo/i);
    expect(pack.sampling?.text).toMatch(/CXG 50/);
    expect(pack.definitions?.text).toMatch(/cavala/i);
    expect(pack.standard.title.en).toMatch(/Especificação/);
  });

  it("extracts the same sections from logical and visual-order Arabic", () => {
    for (const fullText of [arabic, visualArabic(arabic)]) {
      const { pack } = buildMachinePackFromText({
        fullText,
        fileName: "ARS-1184-ar.pdf",
        extractionMethod: "test",
      });
      expect(pack.scope.text.en).toMatch(/تحدد هذه المواصفة/);
      expect(pack.scope.text.en).not.toMatch(/ARS 56/);
      expect(pack.normativeReferences.some((ref) => /ARS 56/i.test(ref.raw))).toBe(true);
      expect(pack.packaging?.text).toMatch(/يعبأ المنتج/);
      expect(pack.labelling?.text).toMatch(/اسم المنتج/);
      expect(pack.sampling?.text).toMatch(/CXG 50/);
      expect(pack.definitions?.text).toMatch(/الماكريل/);
      expect(pack.standard.title.en).toMatch(/مواصفات/);
    }
  });
});
