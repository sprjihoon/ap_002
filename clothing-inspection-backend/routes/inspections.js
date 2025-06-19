// 작업자용 검수전표 목록 조회
router.get('/worker', auth, async (req, res) => {
  try {
    const inspections = await Inspection.find({
      assignedWorker: req.user.id
    }).sort({ createdAt: -1 });
    res.json(inspections);
  } catch (error) {
    res.status(500).json({ message: '검수전표 조회에 실패했습니다.' });
  }
});

// 작업 상태 업데이트
router.put('/:id/work-status', auth, async (req, res) => {
  try {
    const { workStatus, workNote } = req.body;
    const inspection = await Inspection.findById(req.params.id);

    if (!inspection) {
      return res.status(404).json({ message: '검수전표를 찾을 수 없습니다.' });
    }

    if (inspection.assignedWorker.toString() !== req.user.id) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    inspection.workStatus = workStatus;
    inspection.workNote = workNote;
    inspection.workDate = new Date();

    await inspection.save();
    res.json({ message: '작업 상태가 업데이트되었습니다.' });
  } catch (error) {
    res.status(500).json({ message: '작업 상태 업데이트에 실패했습니다.' });
  }
});

// 바코드 스캔 처리
router.post('/scan', auth, async (req, res) => {
  try {
    const { barcode } = req.body;

    // 1. 바코드로 제품 찾기
    const product = await Product.findOne({ barcode });
    if (!product) {
      return res.status(404).json({ message: '존재하지 않는 제품입니다.' });
    }

    // 2. 해당 제품이 포함된 미완료 전표 찾기
    const inspections = await Inspection.find({
      'items.product': product._id,
      'items.remainingQuantity': { $gt: 0 },
      status: { $ne: 'completed' }
    })
    .sort({ createdAt: -1 })
    .populate('items.product')
    .populate('assignedWorker');

    if (inspections.length === 0) {
      return res.status(404).json({ message: '해당 제품의 미완료 전표가 없습니다.' });
    }

    // 3. 가장 최근 전표 선택
    const inspection = inspections[0];
    const item = inspection.items.find(i => 
      i.product._id.toString() === product._id.toString() && 
      i.remainingQuantity > 0
    );

    if (!item) {
      return res.status(404).json({ message: '해당 제품의 남은 수량이 없습니다.' });
    }

    // 4. 응답 데이터 구성
    const response = {
      inspection: {
        id: inspection._id,
        inspectionNumber: inspection.inspectionNumber,
        clientName: inspection.clientName,
        inspectionType: inspection.inspectionType,
        status: inspection.status
      },
      item: {
        product: {
          id: product._id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode
        },
        quantity: item.quantity,
        remainingQuantity: item.remainingQuantity,
        status: item.status
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Barcode scan error:', error);
    res.status(500).json({ message: '바코드 스캔 처리 중 오류가 발생했습니다.' });
  }
});

// 스캔 결과 처리
router.post('/:inspectionId/items/:itemId/scan-result', auth, async (req, res) => {
  try {
    const { inspectionId, itemId } = req.params;
    const { result, quantity, note } = req.body;

    const inspection = await Inspection.findById(inspectionId);
    if (!inspection) {
      return res.status(404).json({ message: '전표를 찾을 수 없습니다.' });
    }

    if (inspection.assignedWorker.toString() !== req.user.id) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    const item = inspection.items.id(itemId);
    if (!item) {
      return res.status(404).json({ message: '품목을 찾을 수 없습니다.' });
    }

    if (item.remainingQuantity < quantity) {
      return res.status(400).json({ message: '남은 수량보다 많은 수량을 입력할 수 없습니다.' });
    }

    // 스캔 결과 추가
    item.results.push({
      result,
      quantity,
      note,
      scannedAt: new Date()
    });

    // 남은 수량 업데이트
    item.remainingQuantity -= quantity;

    // 품목 상태 업데이트
    if (item.remainingQuantity === 0) {
      item.status = 'completed';
    } else {
      item.status = 'in_progress';
    }

    // 전표 상태 업데이트
    inspection.updateStatus();

    await inspection.save();

    res.json({
      message: '스캔 결과가 저장되었습니다.',
      remainingQuantity: item.remainingQuantity,
      itemStatus: item.status,
      inspectionStatus: inspection.status
    });
  } catch (error) {
    console.error('Scan result error:', error);
    res.status(500).json({ message: '스캔 결과 처리 중 오류가 발생했습니다.' });
  }
}); 