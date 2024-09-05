export const questions = [
	{
		id: "Q1",
		text: "Quel titre de transport avez-vous ?",
		options: [
			{ text: "Un titre de transport « Navette »", next: "Q2" },
			{
				text: "Un titre de transport « TER Remi Centre Val de Loire »",
				next: "Q2",
			},
			{ text: "Un titre de transport « Fil Bleu »", next: "Q2" },
			{ text: "Aucun titre de transport", next: "Q2" },
		],
	},
	{
		id: "Q2",
		text: "Allez-vous faire ou avez-vous fait une correspondance avec un TGV ou un OUIGO ?",
		options: [
			{ text: "OUI", next: "end" },
			{ text: "NON", next: "end" },
		],
	},
];
