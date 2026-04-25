openingphrases = ["can you", "can", "you", "can you please", "please"]

closingphrase = ["Thank you", "GoodBye", "Okay Bye", "thanks"]

function findAmbiguity(prompt) {
  const ambiguousPhrases = [...openingphrases, ...closingphrase];
  const lowerPrompt = prompt.toLowerCase();

  const found = ambiguousPhrases.filter(phrase =>
    lowerPrompt.includes(phrase.toLowerCase())
  );

  if (found.length > 0) {
    console.log("Ambiguous phrases found:", found);
  }

}

function reduceAmbiguity(prompt) {
  const ambiguousPhrases = [...openingphrases, ...closingphrase]
    .sort((a, b) => b.length - a.length);

  let reduced = prompt;
  for (const phrase of ambiguousPhrases) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    reduced = reduced.replace(regex, '');
  }

  return reduced.replace(/\s+/g, ' ').trim();
}



function countChar(prompt) {
    console.log(prompt.length);
    return prompt.length;
}  
