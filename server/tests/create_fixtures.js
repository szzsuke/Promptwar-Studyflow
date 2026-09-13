const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const dir = path.join(__dirname, '../../test_files');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// 1. Invalid non-PDF file
fs.writeFileSync(path.join(dir, 'invalid_notes.txt'), 'This is a plain text file, not a PDF.');

// 2. Empty PDF file (0 bytes)
fs.writeFileSync(path.join(dir, 'empty_lecture.pdf'), Buffer.alloc(0));

// 3. Realistic Lecture PDF generated with PDFKit
const doc = new PDFDocument({ margin: 50 });
const pdfPath = path.join(dir, 'sample_lecture.pdf');
const writeStream = fs.createWriteStream(pdfPath);
doc.pipe(writeStream);

doc.fontSize(22).text('CS401: Introduction to Neural Networks & Deep Learning', { underline: true });
doc.moveDown(0.5);
doc.fontSize(12).fillColor('#666666').text('Instructor: Prof. Alan Turing | Department of Computer Science');
doc.moveDown(1);

doc.fontSize(16).fillColor('#000000').text('1. Biological Inspiration & The Artificial Perceptron');
doc.moveDown(0.3);
doc.fontSize(11).text(
  'Artificial Neural Networks (ANNs) are computational systems inspired by biological brains. ' +
  'The fundamental computational building block is the artificial neuron (perceptron). ' +
  'A perceptron takes multiple weighted inputs, adds a learnable bias term, and passes the result through an activation function to generate an output scalar.'
);
doc.moveDown(0.8);

doc.fontSize(16).text('2. Critical Role of Non-Linear Activation Functions');
doc.moveDown(0.3);
doc.fontSize(11).text(
  'Without non-linear activation functions, a multi-layer neural network collapses into a single linear matrix transformation, regardless of depth. ' +
  'Key activation functions discussed in this lecture include:'
);
doc.moveDown(0.3);
doc.fontSize(11).list([
  'Sigmoid Function: Squashes input values between 0 and 1, traditionally used for binary probability.',
  'ReLU - Rectified Linear Unit: Computationally efficient, accelerates convergence, and avoids gradient vanishing.',
  'Softmax: Normalizes a K-dimensional vector of raw logits into a valid probability distribution where probabilities sum to 1.0.'
]);
doc.moveDown(0.8);

doc.fontSize(16).text('3. Optimization via Backpropagation & Gradient Descent');
doc.moveDown(0.3);
doc.fontSize(11).text(
  'Neural networks learn optimal weights by minimizing an empirical loss function. ' +
  'Backpropagation leverages the chain rule of differential calculus to efficiently compute partial derivatives of loss with respect to all layer weights. ' +
  'Gradient descent iteratively updates parameters in the opposite direction of the gradient vector: W_new = W_old - learning_rate * dL/dW.'
);
doc.moveDown(0.8);

doc.fontSize(16).text('4. Overfitting & Regularization Strategies');
doc.moveDown(0.3);
doc.fontSize(11).text(
  'High model capacity can lead to overfitting on training data. Common mitigation techniques include Dropout (randomly deactivating neurons during forward pass) and L2 Weight Decay.'
);

doc.end();

writeStream.on('finish', () => {
  console.log('Successfully generated sample_lecture.pdf in:', dir);
});
