import { PDFDocument } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import mammoth from 'mammoth';

function countSyllables(word) {
    if (word.length <= 3) return 1;
    word = word.toLowerCase();
    const matches = word.match(/[aeiouy]{1,2}/g);
    let syllables = matches ? matches.length : 1;
    if ((word.endsWith("es") && !word.endsWith("sses")) ||
        (word.endsWith("ed") && !word.endsWith("lled")) ||
        (word.endsWith("e") && !'aeiouy'.includes(word[word.length-2]))) {
        syllables--;
    }
    return Math.max(1, syllables);
} 

function fleschKincaidReadability(text) {
    const sentences = text.split(/[.!?]/).filter(sentence => sentence.trim() !== '');
    const words = text.split(/[^a-zA-Z]+/);
    var syllables = 0;
    for (let word of words) {
        syllables += countSyllables(word);
    }
    const gradeLevel = 0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59;
    return gradeLevel
}

function getscorelevel(gradeLevel) {
    return gradeLevel < 1 ? 'Kindergarten' : 
           gradeLevel > 16 ? 'Post-graduate' : 
           gradeLevel > 12 ? 'College' : 
           Math.floor(gradeLevel) + '-' + Math.ceil(gradeLevel) + ' grade';
}


const informedConsentInput = document.getElementById('consent');
informedConsentInput.addEventListener('input', function() {
    updateScore(informedConsentInput.value, sinfoInput.value);
}) 

function updateScore(consent, sinfo) {
    const combinedText = consent + sinfo;
    const readablityScore = fleschKincaidReadability(combinedText);
    const mylevelscore = getscorelevel(readablityScore);
    document.getElementById('readabilityScore').innerText = `Readability Score: ${mylevelscore}`;


        if (readablityScore >= 12) {
            document.getElementById('readabilityScore').style.color = 'green';
    } else {
        document.getElementById('readabilityScore').style.color = 'red'; 
    }
}

const sinfoInput = document.getElementById('sinfo');
sinfoInput.addEventListener('input', function () {
    updateScore(informedConsentInput.value, sinfoInput.value);
});

async function generatePDF() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const contact = document.getElementById('contact').value;
    const department = document.getElementById('department').value;
    const notRobot = document.getElementById('notRobot').checked;
    const cuAffiliation = document.getElementById('cu-affiliation').value;
    const titleOfStudy = document.getElementById('title').value;
    const additionalInvestigator = document.querySelector('input[name="additional-investigator"]:checked').value;
    const citiCompletionDate = document.getElementById('start-date').value;
    const informedConsent = informedConsentInput.value;
    const fileInput = document.getElementById('fileUpload');
    const sinfo = document.getElementById('sinfo').value;

    const combinedText = informedConsent + sinfo;

    // const readablityScore = fleschKincaidReadability(informedConsent) 
    // const readablityScoreInfo = fleschKincaidReadability(sinfo)

    // const mylevelscore = getscorelevel((readablityScore + readablityScoreInfo)/2)
    const mylevelscore = getscorelevel(fleschKincaidReadability(combinedText))

    console.log("final score is " + mylevelscore )
    // console.log("readablityScoreInfo is " + readablityScoreInfo )

    if (!notRobot) {
        alert('Please confirm you are not a robot.');
        return;
    }

    if (fileInput.files.length === 0) {
        alert('Please select at least one file to upload.');
        return;
    }

    try {
        const mergedPdf = await PDFDocument.create();

        const formDoc = new jsPDF();
        formDoc.setFontSize(16);
        formDoc.text("IRB Submission Form", 20, 20);
        formDoc.setFontSize(12);
        formDoc.text(`Name: ${name}`, 20, 40);
        formDoc.text(`Email: ${email}`, 20, 50);
        formDoc.text(`Contact: ${contact}`, 20, 60);
        formDoc.text(`Department: ${department}`, 20, 70);
        formDoc.text(`CU Affiliation: ${cuAffiliation}`, 20, 80);
        formDoc.text(`Title of Study: ${titleOfStudy}`, 20, 90);
        formDoc.text(`Additional Investigator: ${additionalInvestigator}`, 20, 100);
        formDoc.text(`CITI Completion Date: ${citiCompletionDate}`, 20, 110);

        
        const consentText = formDoc.splitTextToSize(`Key Information: ${informedConsent}`, 170); 

        // formDoc.text(consentText, 20, 80); 
        
        const lineHeight = 10; 
        const numberOfLines = consentText.length;
        // let nextYPosition = 120 + (numberOfLines * lineHeight); 
        const boxHeight = numberOfLines * lineHeight;
        formDoc.rect(15, 115, 180, boxHeight + 10); 
        formDoc.text(consentText, 20, 120);

        let nextYPosition = 120 + boxHeight + 20;
 


        const consentText2 = formDoc.splitTextToSize(`Study Information: ${sinfo}`, 170);
        
            for (let i = 0; i < consentText2.length; i++) {
            if (nextYPosition + lineHeight > 280) { 
                formDoc.addPage(); 
                nextYPosition = 20; 
            }
            formDoc.text(consentText2[i], 20, nextYPosition); 
            nextYPosition += lineHeight; // Increment Y position
            }

        formDoc.text(`Readability Score (Flesch-Kincaid): ${mylevelscore}`, 20, nextYPosition);

        // formDoc.text(`Readability Score (Flesch-Kincaid): ${mylevelscore}`, 20, 90);


        const formPdfBytes = formDoc.output('arraybuffer');
        const formPdfDoc = await PDFDocument.load(formPdfBytes);
        const formPages = await mergedPdf.copyPages(formPdfDoc, formPdfDoc.getPageIndices());
        formPages.forEach(page => mergedPdf.addPage(page));

        let allText = `${name} ${email} ${contact} ${department} `;

        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            const fileType = file.type.toLowerCase();

            if (fileType.includes('image')) {
                const imageBytes = await file.arrayBuffer();
                let image;
                
                if (fileType.includes('png')) {
                    image = await mergedPdf.embedPng(imageBytes);
                } else if (fileType.includes('jpeg') || fileType.includes('jpg')) {
                    image = await mergedPdf.embedJpg(imageBytes);
                } else {
                    console.warn(`Unsupported image type: ${fileType}`);
                    continue;
                }

                const imagePage = mergedPdf.addPage();
                const { width, height } = image.size();
                const pageWidth = imagePage.getSize().width;
                const pageHeight = imagePage.getSize().height;
                
                const scale = Math.min(
                    pageWidth / width,
                    pageHeight / height
                );

                imagePage.drawImage(image, {
                    x: (pageWidth - width * scale) / 2,
                    y: (pageHeight - height * scale) / 2,
                    width: width * scale,
                    height: height * scale
                });
            } else if (fileType.includes('pdf')) {
                const uploadedPdfBytes = await file.arrayBuffer();
                const uploadedPdfDoc = await PDFDocument.load(uploadedPdfBytes);
                const uploadedPages = await mergedPdf.copyPages(uploadedPdfDoc, uploadedPdfDoc.getPageIndices());
                uploadedPages.forEach(page => mergedPdf.addPage(page));
            } else if (fileType.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                const arrayBuffer = await file.arrayBuffer();
                const { value: wordText } = await mammoth.extractRawText({ arrayBuffer });
                allText += wordText + ' ';
            }
        }

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'submission-package.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error processing files:', error);
        alert('Error processing files. Please try again.');
    }
}

// Attach to window to make globally accessible
window.generatePDF = generatePDF;

export { generatePDF }; 