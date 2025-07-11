import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Button, Paper, TextField } from '@mui/material';
import { Stage, Layer, Rect, Text as KonvaText } from 'react-konva';
import { fetchWithAuth } from '../utils/api';

const LabelDesigner = () => {
  const { id } = useParams();
  const [template,setTemplate] = useState({ width:60, height:40, items:[] });
  const [selectedId,setSelectedId] = useState(null);

  useEffect(()=>{
    if(id){
      fetchWithAuth(`/api/labels/templates/${id}`).then(t=>{
        try{
          const spec = JSON.parse(t.jsonSpec);
          setTemplate({ ...t, ...spec });
        }catch(e){ console.error(e); }
      });
    }
  },[id]);

  const addBarcode = ()=>{
    setTemplate(prev=>({ ...prev, items:[...prev.items,{ id:Date.now(), type:'barcode', x:10,y:10,w:50,h:20, field:'barcode' }] }));
  };
  const addText = ()=>{
    setTemplate(prev=>({ ...prev, items:[...prev.items,{ id:Date.now(), type:'text', x:10,y:35,w:50,h:10, field:'inspectionName', fontSize:12 }] }));
  };

  const save = async()=>{
    const jsonSpec = JSON.stringify({ width:template.width, height:template.height, items:template.items });
    await fetchWithAuth('/api/labels/templates',{ method:'POST', body:JSON.stringify({ id, name:template.name||'템플릿', width:template.width, height:template.height, jsonSpec }) });
    alert('저장됨');
  };

  const scale=5; // 1mm =>5px for preview

  return (
    <Box sx={{p:3, display:'flex', gap:2}}>
      {/* Palette */}
      <Paper sx={{p:2, width:120}}>
        <Typography variant="h6">팔레트</Typography>
        <Button variant="outlined" fullWidth sx={{mb:1}} onClick={addBarcode}>Barcode</Button>
        <Button variant="outlined" fullWidth onClick={addText}>Text</Button>
        <Button variant="contained" color="success" fullWidth sx={{mt:2}} onClick={save}>저장</Button>
      </Paper>
      {/* Canvas */}
      <Paper sx={{p:2}}>
        <Stage width={template.width*scale+2} height={template.height*scale+2} style={{border:'1px solid #ccc'}}>
          <Layer>
            <Rect x={0} y={0} width={template.width*scale} height={template.height*scale} stroke="#999" />
            {template.items.map(item=> (
              <KonvaText key={item.id} x={item.x*scale} y={item.y*scale} text={item.type==='barcode'?'[Barcode]':item.field} fontSize={12} fill={selectedId===item.id?'red':'black'} onClick={()=>setSelectedId(item.id)} />
            ))}
          </Layer>
        </Stage>
      </Paper>
      {/* Simple property panel */}
      <Paper sx={{p:2, width:250}}>
        <Typography variant="h6">속성</Typography>
        {selectedId && (()=>{
          const itm = template.items.find(i=>i.id===selectedId);
          if(!itm) return null;
          const setItm = (patch)=>{
            setTemplate(prev=>({ ...prev, items:prev.items.map(it=> it.id===selectedId? {...it,...patch}:it) }));
          };
          return (<Box sx={{display:'flex',flexDirection:'column',gap:1}}>
            <TextField label="field" value={itm.field||''} onChange={e=>setItm({ field:e.target.value })} size="small" />
            <TextField label="x" type="number" value={itm.x} onChange={e=>setItm({ x:Number(e.target.value) })} size="small" />
            <TextField label="y" type="number" value={itm.y} onChange={e=>setItm({ y:Number(e.target.value) })} size="small" />
          </Box>);
        })()}
      </Paper>
    </Box>
  );
};
export default LabelDesigner; 
