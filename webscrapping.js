//node webscrapping.js --url="https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results" --dest="worldcup.csv"
//args.data="world cup" --pdf="template.pdf"
let minimist=require("minimist");
let fs=require("fs");
let axios=require("axios");
let jsdom=require("jsdom");
let excel=require("excel4node");
let pdf=require("pdf-lib");
let args=minimist(process.argv);
let path=require("path");

//DOWNLOAD USING AXIOS
let responsekapromise=axios.get(args.url);
responsekapromise.then(function(response){
    let html=response.data;
    let dom= new jsdom.JSDOM(html);
    let document=dom.window.document;
    let matches=[];
    let totalmatches=document.querySelectorAll("div.match-score-block");
    for(let i=0;i<totalmatches.length;i++){
       let match={

        };
        let nameps=totalmatches[i].querySelectorAll("p.name");
        match.t1=nameps[0].textContent;
        match.t2=nameps[1].textContent;

        let score=totalmatches[i].querySelectorAll("div.score-detail>span.score");
        if(score.length==2){
            match.t1s=score[0].textContent;
            match.t2s=score[1].textContent;

        }
        else if(score.length==1){
            match.t1s=score[0].textContent;
            match.t2s="";
        }
        else{
            match.t1s="";
            match.t2s="";
        }

        let resultps=totalmatches[i].querySelector("div.status-text>span");
        match.result=resultps.textContent;
        matches.push(match);
    }
    //WRITING JSON FILES 
    let matchesjson=JSON.stringify(matches);
    fs.writeFileSync("matches.json",matchesjson,"utf-8");

    let teams=[];
    for(let i=0;i<matches.length;i++){
        putteaminteamsarrayifmissing(teams,matches[i].t1);
        putteaminteamsarrayifmissing(teams,matches[i].t2);

    }
    for(let i=0;i<matches.length;i++){
        putmatchesinappropriateteam(teams,matches[i].t1,matches[i].t2,matches[i].t1s,matches[i].t2s,matches[i].result);
        putmatchesinappropriateteam(teams,matches[i].t2,matches[i].t1,matches[i].t2s,matches[i].t1s,matches[i].result);

    }
    let teamsjson=JSON.stringify(teams);
    fs.writeFileSync("teams.json",teamsjson,"utf-8");

    //JSON TO EXCEL 
    excelsheet(teams,args.dest);
    
    //PDF WRITING
    preparefoldersandpdf(teams,args.data);
    

    
})
function preparefoldersandpdf(teams,foldername){
    fs.mkdirSync(foldername);
    for(let i=0;i<teams.length;i++){
        let teamfn=path.join(foldername,teams[i].name);
        fs.mkdirSync(teamfn);
        for(let j=0;j<teams[i].matches.length;j++){
            let matchfilename=path.join(teamfn,teams[i].matches[j].vs +".pdf");
            createcsorecard(teams[i].name,teams[i].matches[j],matchfilename);
        }
    }
}
function createcsorecard(teamname,match,filename){
    let t1name=teamname;
    let t2name=match.vs;
    let t1score=match.selfscore;
    let t2score=match.opponentscore;
    let result=match.result;
    let templatebytes=fs.readFileSync(args.pdf);
    let promisetoload=pdf.PDFDocument.load(templatebytes);
    promisetoload.then(function(pdfdoc){
        let page=pdfdoc.getPage(0);
        page.drawText(t1name,{
            x:320,
            y:720,
            size:15
        });
        page.drawText(t2name,{
            x:320,
            y:700,
            size:15
        });
        page.drawText(t1score,{
            x:320,
            y:680,
            size:15
        });page.drawText(t2score,{
            x:320,
            y:660,
            size:15
        });page.drawText(result,{
            x:320,
            y:640,
            size:15
        });
        let changedbytespromis=pdfdoc.save();
        changedbytespromis.then(function(changedbytes){
            fs.writeFileSync(filename,changedbytes);
        })
    })
}

function excelsheet(teams,sheetname){
    let wb=new excel.Workbook();
    for(let i=0;i<teams.length;i++){
        let sheet=wb.addWorksheet(teams[i].name);
        sheet.cell(1,1).string("vs");
        sheet.cell(1,2).string("self score");
        sheet.cell(1,3).string("opp score");
        sheet.cell(1,4).string("result");
        for(let j=0;j<teams[i].matches.length;j++){
            sheet.cell(j+2,1).string(teams[i].matches[j].vs);
            sheet.cell(j+2,2).string(teams[i].matches[j].selfscore);
            sheet.cell(j+2,3).string(teams[i].matches[j].opponentscore);
            sheet.cell(j+2,4).string(teams[i].matches[j].result);
}

    }
    wb.write(sheetname);
}
function putteaminteamsarrayifmissing(teams,matchname){
    let tidx=-1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name==matchname){
            tidx=i;
            break;
        }
    }
    if(tidx==-1){
        teams.push({
            name:matchname,
            matches:[]
        })
    }


}
function putmatchesinappropriateteam(teams,hometeam,oppoteam,homescore,opposcore,result){
    let tidx=-1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name==hometeam){
            tidx=i;
            break;
        }
    }
    let team1=teams[tidx];
    team1.matches.push({
        vs:oppoteam,
        selfscore:homescore,
        opponentscore:opposcore,
        result:result
    })

}
