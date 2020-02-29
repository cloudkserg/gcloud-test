const superRound = x => Math.round((x + Number.EPSILON) * 100) / 100;

//Создаем приложение
new Vue({
    el: '#app',
    data: {
        totalPrice: null,
        image: null,
        imageUrl: null,
        serverError: null,
        error: '',
        //По умолчанию ищем путь из точки с ноль, ноль
        rows: null
    },
    computed: {
      totalTablePrice() {
          if (!this.rows) {
              return 0;
          }
          return superRound(this.rows.reduce((sum, row) => sum + parseFloat(row.price), 0));
      }
    },
    methods: {
        onFileChange(e) {
            this.image = e.target.files[0];
            this.imageUrl = URL.createObjectURL(this.image);
        },
        submitImage() {
            let formData = new FormData();
            formData.append('image', this.image);
            this.serverError = null;
            axios.post( '/upload',
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' }}
            ).then((res) => {
                if (!res.data || !res.data.rows) {
                    this.serverError = res;
                }
                this.rows = res.data.rows;
                this.totalPrice = res.data.totalPrice;
            })
            .catch((res) => {
                this.serverError = res;
            });
        }
    },
});
