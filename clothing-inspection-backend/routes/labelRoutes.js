const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const LabelTemplate = require('../models/labelTemplate');

// 목록
router.get('/templates', auth, async (req,res)=>{
  try{
    const list = await LabelTemplate.findAll({ where:{ ownerId: req.user.id } });
    res.json(list);
  }catch(err){ res.status(500).json({ message:err.message }); }
});

// 생성/업데이트 (id 있으면 업데이트)
router.post('/templates', auth, async (req,res)=>{
  try{
    const { id, name, width, height, jsonSpec } = req.body;
    let tpl;
    if(id){
      tpl = await LabelTemplate.findByPk(id);
      if(!tpl) return res.status(404).json({ message:'template not found' });
      await tpl.update({ name,width,height,jsonSpec });
    }else{
      tpl = await LabelTemplate.create({ name,width,height,jsonSpec, ownerId:req.user.id });
    }
    res.json(tpl);
  }catch(err){ res.status(500).json({ message:err.message }); }
});

// 삭제
router.delete('/templates/:id', auth, async (req,res)=>{
  try{ await LabelTemplate.destroy({ where:{ id:req.params.id, ownerId:req.user.id } });
    res.json({ success:true }); }
  catch(err){ res.status(500).json({ message:err.message }); }
});

// 출력 (stub)
router.post('/print', auth, async (req,res)=>{
  try{
    const { inspectionId, templateId } = req.body;
    // TODO: build PDF or printer command
    res.json({ success:true, message:'print job queued', inspectionId, templateId });
  }catch(err){ res.status(500).json({ message:err.message }); }
});

// 단일 조회
router.get('/templates/:id', auth, async (req,res)=>{
  try{
    const tpl = await LabelTemplate.findByPk(req.params.id);
    if(!tpl) return res.status(404).json({ message:'not found' });
    res.json(tpl);
  }catch(err){ res.status(500).json({ message:err.message }); }
});

module.exports = router; 