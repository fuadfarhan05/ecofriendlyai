openingphrases = ["can you", "can", "you", "can you please", "please"]

closingphrase = ["Thank you", "GoodBye", "Okay Bye"]

function reduceAmbiguity(prompt) {
  const ambiguousPhrases = [...openingphrases, ...closingphrase];
  const lowerPrompt = prompt.toLowerCase();

  const found = ambiguousPhrases.filter(phrase =>
    lowerPrompt.includes(phrase.toLowerCase())
  );

  if (found.length > 0) {
    console.log("Ambiguous phrases found:", found);
  }

  return prompt;
}

function countChar(prompt) {
    console.log(prompt.length);
    return prompt.length;
}  
