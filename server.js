const fs=require("fs");
const path=require("path");
const http=require("http");
const { IncomingForm }=require("formidable");

const server=http.createServer((req,res)=>{
    if(req.method==="POST" && req.url==="/upload"){
        const form=new IncomingForm({
            keepExtensions:true,
            multiples:true,
            uploadDir:path.join(__dirname,"uploads"),
            maxFileSize: 5 * 1024 * 1024 * 1024 * 1024 *1024,
            filter: ({ mimetype }) => ['image/jpeg', 'image/png', 'application/pdf',"video/mp4"].includes(mimetype)
        });

        // Progress Event
        form.on('progress', (bytesReceived, bytesExpected) => {
            console.log(`Upload progress: ${bytesReceived} / ${bytesExpected}`);
        });

        form.parse(req,(err,fields,files)=>{
            debugger
            if(err){
                res.writeHead(500,{"Content-Type":"application/json"});
                res.end("Error while parsing the Files");
            }

            const uploaded=[];
            const allFiles=Array.isArray(files.file) ? files?.file : [files?.file];

            for(const file of allFiles){
                debugger
                const oldPath =file.filepath;
                const uploadDir=path.join(__dirname,"uploads");
                const newPath=path.join(uploadDir,file.originalFilename);
                try{
                    fs.renameSync(oldPath,newPath);
                    uploaded.push({
                        filename:file.originalFilename,
                        url:`uploads/${file.originalFilename}`
                    });
                } catch (renameErr){
                    res.writeHead(400);
                    return res.end(JSON.stringify({error:"Rename failed"}))
                }
            }

            res.writeHead(200,{"Content-Type":"application/json"});
            res.end(JSON.stringify({
                message:"Files Uploaded Successfully",
                files,
                fields
            }))
        })
    } else if(req.method==="GET" && req.url.startsWith("/file")){
        const url=new URL(req.url,`http://${req.headers.host}`);
        const fileName=url.searchParams.get("file");
        const uploadDir=path.join(__dirname,"uploads");
        const filePath=path.join(uploadDir,fileName);

        fs.access(filePath,fs.constants.F_OK,(err)=>{
            if(err){
                res.writeHead(400,{"Content-Type":"application/json"});
                return res.end(JSON.stringify({
                    message:"Error while file reading"
                }));
            }

            const ext=path.extname(fileName).toLowerCase();
            const contentType={
                ".jpg":"image/jpeg",
                ".jpeg":"image/jpeg",
                ".png":"image/png",
                ".pdf":"application/pdf",
                ".txt":"text/plain",
                ".mp4":"video/mp4"
            }[ext] || "application/octet-stream";

            res.writeHead(200,{"Content-Type":contentType});
            fs.createReadStream(filePath).pipe(res);
        });
    } else if(req.method==="GET" && req.url.startsWith("/download")){
        const url=new URL(req.url,`http://${req.headers.host}`);
        const filename=url.searchParams.get("file");
        if(!filename){
            res.writeHead(400,{
                "Content-Type":"application/json"
            });
            return res.end("File Stream Error");
        }

        const uploadDir=path.join(__dirname,"uploads");
        const filePath=path.join(uploadDir,filename);
        if(!fs.existsSync(filePath)){
            res.writeHead(404);
            return res.end("File not found");
        }

        res.writeHead(200,{
            "Content-Disposition":`attachment; filename="${filename}`,
            "Content-Type":"application/octet-stream"
        });

        const fileStream=fs.createReadStream(filePath);
        fileStream.pipe(res);
        fileStream.on("error",()=>{
            res.writeHead(400,{
                "Content-Type":"application/json"
            });
            return res.end("File Stream Error");
        });


    }else {
        res.writeHead(404);
        res.end(JSON.stringify({
            message:"Route Not Found",
        }))
    }
});

server.listen(5000,()=>{ console.log("Server Running at PORT 5000 http://localhost:5000")})